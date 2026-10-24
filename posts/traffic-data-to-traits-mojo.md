---
title: "From Traffic Data to Traits: How a Slow Clustering Job Led Me to Mojo"
slug: "traffic-data-to-traits-mojo"
readTime: "7 min read"
excerpt: "There’s a lot of beauty in software optimizations. It’s like building a mechanical Swiss watch; you strip away the abstractions until you can watch the logic work on the physical machine. Often, the most unassuming changes can squeeze unbelievable amounts of performance."
---

*Cross-posted from [MIT](https://jclinic.mit.edu/from-traffic-data-to-traits-how-a-slow-clustering-job-led-me-to-mojo/)*

There’s a lot of beauty in software optimizations. It’s like building a mechanical Swiss watch; you strip away the abstractions until you can watch the logic work on the physical machine. Often, the most unassuming changes can squeeze unbelievable amounts of performance.

Consider data layouts for instance. Suppose you wish to represent a long list of coordinate points. Following traditional Object Oriented Programming patterns, we would build a structure called ‘Point’ that contains an x and y coordinate, and load these points into an array. But if you flip it around, defining an object called Points that contains an array of x coordinates and an array of y coordinates (thereby creating a Structure of Arrays), the hardware behaves completely differently. Mathematically, both patterns represent identical data in the same way. But to silicon, the performance difference is night and day: first, traversing x coordinates no longer forces the CPU to load in the y coordinates (and vice versa); and second, because all the x values are neighbors in memory, the processor can process the contiguous x values in parallel.

My interests in speed didn’t begin with any interest in hardware, though. Rather, it came out of necessity while running clustering algorithms on high dimensional, large public health datasets for my internship project at Jameel Clinic. Utilizing Python and an algorithm called KModes, we analyzed large traffic accident datasets hoping to find an evaluation methodology that could yield interesting results for public policy decision making. As MIT (very reasonably) did not want me playing with their expensive servers, I did all of the clustering locally, on my laptop, and naturally, it was a computational nightmare. From there, you start budgeting your time, not based around ideas, but around how many times you can afford to run your code.

Multi-threading and caching brought the runtime from over an hour to finish an experiment down to under 15 minutes, yet the problem with Python’s execution model remains clear. I had also tried implementing compute-heavy code in a new language called Mojo, but at that time, early 2025, its ecosystem was too nascent and unstable. There has to be a better way.

### The Two Language Problem

If you dig into Python’s stack for long enough, you’ll quickly encounter what is called the two-language problem. Python itself is a very simple, highly abstracted language, making it easy to learn and use for building things quickly. But Python’s interpreter is fundamentally too inefficient for many computationally intensive tasks. Generally, you get around this by doing your hard math in another language (like C++) and binding these functionalities back into Python using something called Foreign Function Interface (FFI).

This methodology, while faster, brings its own complications, though. Aside from the friction from package maintenance difficulties and leaky abstractions, the one big flaw is Python’s eager execution model, which prevents FFI kernel fusion. This means that when a Python library implements vectorized operations using FFI, each call typically executes independently. For instance, consider an evaluation like: `result = a * b + c`, where `a`, `b`, and `c` are large arrays. Under the hood, a compiler can optimize this entire expression into a single loop pass using a CPU instruction called Fused Multiply-Add (FMA). And because the entire calculation happens inside CPU registers, intermediate values stay in registers/cache.

Meanwhile, Python, even though it calls C++ or Fortran via FFI, does it in multiple separate steps. First, the result of `a * b` is computed and the entire intermediate array would be written to the L3 cache or RAM. Then the intermediate value can be read out of cache/RAM to perform addition with array `c`. It’s faster than pure Python, but still slower than we may like, as many CPU cycles are wasted writing and reading data across the memory bus.

But now, Mojo is reaching production stability and it offers a clean resolution to the two language problem. Mojo has the readability and abstractions of Python, but comes with performance, compile-time type safety, memory ownership semantics, and explicit SIMD primitives. Crucially, it compiles natively via MLIR/LLVM meaning if you want to use C functions (such as linear algebra solvers like BLAS and LAPACK), you can directly link the C binaries at compile time and skip the overhead from C-FFI runtime wrappers like in Python.

But though the compiler and language features are now stable, there are still many gaps in the ecosystem, one of which being a machine learning algorithms library. Thus, I built Strata, an open-source machine learning library written natively in Mojo and modeled after Python’s Scikit-Learn library, with a core goal being that the end user never has to trade performance for ergonomics.

### Designing Safe and Efficient ML Pipelines

As Scikit-Learn is a Python library, its core implementation relies on Python's dynamic duck typing. If an object has a `.fit()` and `.predict()` method, Python assumes it's an Estimator by this schema. That’s awesome for flexibility, but it also means errors are discovered only at runtime and the Python interpreter must constantly inspect objects dynamically. And on top of that, this design pattern is also impossible to implement in native Mojo anyway.

In Strata, we enforce strict Estimator structure using something called traits. If an object has a trait, it must implement the functionality and behaviors of this trait. Trait requirements are verified at compile time, meaning code can be optimized and we avoid having to resolve the properties and methods of our Estimator implementations at runtime. Further, we can force every Estimator to implement the Moveable trait. Using the Moveable trait, structs can store their components directly inline by value, which allows us to add convenience structs like Pipeline that can accept any Estimator implementing algorithm with 0 heap pointers. This is in contrast to most languages, where if you want to write generic code that holds an interface or trait, you have to store it behind a heap pointer (e.g. `Box<dyn Estimator>` in Rust), which introduces more overhead.

### Handling Generics

One thing you notice while playing with traits in Mojo, especially if you have experience with Rust, is that Mojo’s traits are generic at the method level but not at the implementation level. In Rust, we can have a pattern where a struct like `LinearRegression<f64>` is generic, but critically, its trait implementation can be monomorphized to a single concrete type. That is, you can implement the Estimator trait for `LinearRegression<f64>` where every method in that implementation block only ever has to handle the type `f64`. This is maybe less convenient for the user, but it’s wonderful for safety (meaning I have to do less work!), and I was originally hoping to implement something similar in Mojo. But Mojo doesn't yet allow this behavior (i.e., no parameterized traits like `trait Estimator[dtype: DType]`). Because a trait cannot reference the struct's own compile-time parameters, any trait method that accepts generic tensors must make the method itself generic, forcing the implementing struct to handle all valid input types rather than just its own internal precision.

This is annoying to deal with, and the solution around having to do non-homogenous matrix operations between two different types was to boundary promote. Methods accept generic DType inputs at the API boundary and promote them internally to the precision parameterized by the struct (for instance, if the struct uses Float 64 but an incoming matrix is of the type Float 32, it gets upcasted). This does allow for some ridiculous edge cases like a LinearRegression that works only with 32 bit integers, but this could only happen as a result of an explicit user choice, and shouldn’t really be a design concern. So for the most part, we preserve Scikit-Learn’s convenient acceptance of varied input while maintaining internal numeric stability.

### Benchmarks

The following benchmarks compare 3 of Strata’s algorithm implementations with Scikit-Learn. More benchmarks as well as benchmarking methodology can be found on the Strata documentation ([https://ethqnol.github.io/strata-mojo/#explanation/benchmarks](https://ethqnol.github.io/strata-mojo/#explanation/benchmarks)).

| Algorithm / Routine | Phase | Workload (N x D) | Strata Median | Scikit-Learn Median | Speedup | Parity / Quality Metric |
| --- | --- | --- | --- | --- | --- | --- |
| Random Forest | fit | 10,000 x 15 | 616.03 ms | 1.83 s | 2.97x faster | Exact Parity |
| Decision Tree Regressor | predict | 10,000 x 15 | 1.18 ms | 1.88 ms | 1.58x faster | Exact Parity (R^2 = 0.89) |
| Linear Regression | fit | 10,000 x 20 | 3.76 ms | 5.02 ms | 1.34x faster | Exact Parity (R^2 = 1.000) |

None of these gains come from inherently smarter algorithmic implementations. Strata and Scikit-Learn both use the same math, the same linear algebra offloading, and the same logic. The speedup comes from removing the FFI’s kernel-fusion gap, linking BLAS/LAPACK directly at compile time rather than through wrappers, and a more efficient memory management model.

### Beyond Large-Scale Compute

The prevalent trend in ML research today is to scale models up by throwing hardware and compute capabilities at the problem until the problem disappears. But in many situations, such as in healthcare, we may find that companies, hospitals, and decision making organizations require models that both provide valuable insights and can also run efficiently on minimal hardware to satisfy privacy and infrastructure constraints.

And while so much of the AI focus is on building the biggest and largest LLMs with less regards to compute costs, my time at the Jameel Clinic pointed me toward understanding how to make these models highly effective, yet efficient enough to deploy where compute is constrained, and Strata was a byproduct of that work.

Strata is an ongoing project to make machine learning both accessible and practical, and if you want to try it out, you can find it on Modular AI's official community package registry at prefix.dev.
