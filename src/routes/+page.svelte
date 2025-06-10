<script lang="ts">
	import Counter from './Counter.svelte';
	const images = import.meta.glob('/static/planes/*', { eager: true, query: { enhanced: true } });

	const image_entries = Object.entries(images);
	let IMAGES_PER_PAGE = 9;

	let current_page = 1;
	let total_pages = Math.ceil(image_entries.length / IMAGES_PER_PAGE);

	let active_image: string | null = null;

	function open_img(path: string) {
		active_image = path;
	}

	function close_img() {
		active_image = null;
	}

	function nextPage() {
		if (current_page < total_pages) current_page++;
	}

	function prevPage() {
		if (current_page > 1) current_page--;
	}
	
</script>

<svelte:head>
	<title>ewu's photos</title>
	<meta name="description" content="photos" />
</svelte:head>

<section>
    <div class="slider-container">
		<label for="per-page">Images per page: {IMAGES_PER_PAGE}</label>
        <input type="range" min="1" max="10" id="per-page" on:input={(e) => {
          IMAGES_PER_PAGE = parseInt((e.target! as HTMLInputElement).value)
          current_page = 1;
          total_pages = Math.ceil(image_entries.length / IMAGES_PER_PAGE);
        }} />
    </div>
    
	<div class="image-grid">
		{#each image_entries.slice((current_page - 1) * IMAGES_PER_PAGE, current_page * IMAGES_PER_PAGE) as [_path, _]}
		    <button class="image-button" on:click={() => open_img(_path.split('/').slice(1).slice(-2).join("/"))}>
						<img src={_path.split('/').slice(1).slice(-2).join("/")} alt="Plane" />
			</button>
			
		{/each}
	</div>

	<div class="pagination">
		<button on:click={prevPage} disabled={current_page === 1}>Previous</button>
		<span>Page {current_page} of {total_pages}</span>
		<button on:click={nextPage} disabled={current_page === total_pages}>Next</button>
	</div>

	{#if active_image}
		<button class="overlay" on:click={close_img}>
		    <!-- svelte-ignore <a11y_click_events_have_key_events> -->
			<img src={active_image} alt="Full aircraft" class="enlarged"/>
		</button>
	{/if}
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 2rem;
	}

	.image-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-top: 2rem;
		max-width: 90vw;
		width: 80vw;
	}
	
	.slider-container {
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.slider-container input[type="range"] {
		width: 200px;
		margin-top: 0.5rem;
	}

	.image-grid img {
		width: 100%;
		height: auto;
		cursor: pointer;
		object-fit: cover;
		border-radius: 0.5rem;
		transition: transform 0.2s ease;
	}
	
	.image-grid button {
		background-color: transparent;
		border: none;
		cursor: pointer;
		width: 100%;
		height: auto;
		cursor: pointer;
		object-fit: cover;
		border-radius: 0.5rem;
		padding: 0;
		margin: 0;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		transition: transform 0.2s ease;
	}

	.image-grid img:hover {
		transform: scale(1.03);
	}

	.pagination {
		margin-top: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.pagination button {
		padding: 0.5rem 1rem;
		border: none;
		background-color: #444;
		color: white;
		border-radius: 0.4rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.pagination button:disabled {
		background-color: #999;
		cursor: not-allowed;
	}

	.pagination span {
		font-weight: bold;
	}

	.overlay {
		position: fixed;
		inset: 0;
		background-color: black;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
		cursor: zoom-out;
		border: none;
	}

	.enlarged {
		max-width: 80vw;
		max-height: 80vh;
		border-radius: 1rem;
		box-shadow: 0 0 30px rgba(255, 255, 255, 0.2);
	}
</style>
