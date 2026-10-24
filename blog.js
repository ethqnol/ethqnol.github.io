/**
 * Ethan Wu — Medium-Style Minimalist Blog Loader
 * Pure client-side Markdown rendering with zero dependencies (using marked.js).
 */

const FALLBACK_POSTS = [
  {
    slug: 'catch-22-style-and-substance',
    file: 'posts/catch-22-style-and-substance.md',
    title: 'The Architecture of Absurdity in Catch-22',
    readTime: '4 min read',
    excerpt: 'A potential temptation when analyzing writing is to treat style and substance separately. But Catch-22’s technical execution is not a series of arbitrary cyclical story lines—it is precisely engineered to describe a terrifying philosophy: that modern bureaucracy is a self-preserving, fake reality that distorts logic to ensure its immortality.'
  },
  {
    slug: 'traffic-data-to-traits-mojo',
    file: 'posts/traffic-data-to-traits-mojo.md',
    title: 'From Traffic Data to Traits: How a Slow Clustering Job Led Me to Mojo',
    readTime: '7 min read',
    crossPostNotice: 'Cross-posted from MIT',
    crossPostUrl: 'https://jclinic.mit.edu/from-traffic-data-to-traits-how-a-slow-clustering-job-led-me-to-mojo/',
    excerpt: 'There’s a lot of beauty in software optimizations. It’s like building a mechanical Swiss watch; you strip away the abstractions until you can watch the logic work on the physical machine. Often, the most unassuming changes can squeeze unbelievable amounts of performance.'
  }
];

let postsData = FALLBACK_POSTS;

function parseFrontmatter(rawText) {
  const meta = {};
  let content = rawText;
  if (rawText.startsWith('---')) {
    const end = rawText.indexOf('\n---', 3);
    if (end !== -1) {
      const rawMeta = rawText.slice(3, end).trim();
      content = rawText.slice(end + 4).trim();
      rawMeta.split('\n').forEach(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim();
          let val = line.slice(colonIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          meta[key] = val;
        }
      });
    }
  }
  return { meta, content };
}

async function fetchMarkdown(post) {
  let rawMarkdown = '';
  try {
    const res = await fetch(post.file);
    if (res.ok) {
      rawMarkdown = await res.text();
    }
  } catch (e) {
    console.warn(`Could not fetch ${post.file}, using embedded fallback`, e);
  }

  if (!rawMarkdown) {
    const tpl = document.getElementById(`fallback-${post.slug}`);
    if (tpl) {
      rawMarkdown = tpl.textContent.trim();
    }
  }
  return rawMarkdown;
}

function navigateToFeed() {
  if (window.location.hash) {
    history.pushState(null, '', window.location.pathname);
  }
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderFeed(app) {
  const tabHome = document.getElementById('tab-home');
  if (tabHome) tabHome.classList.add('active');

  let feedHtml = '<div class="medium-feed">';

  postsData.forEach(post => {
    const crossPostHeader = post.crossPostUrl
      ? `<div class="medium-meta-top"><em>Cross-posted from <a href="${post.crossPostUrl}" target="_blank" rel="noopener">MIT</a></em></div>`
      : '';

    feedHtml += `
      <article class="medium-story-card">
        ${crossPostHeader}
        <h2 class="medium-story-title">
          <a href="#${post.slug}">${post.title}</a>
        </h2>
        <p class="medium-story-excerpt">${post.excerpt}</p>
        <div class="medium-story-footer">
          <span class="medium-read-time">${post.readTime || ''}</span>
          <a href="#${post.slug}" class="medium-read-link">Read full story &rarr;</a>
        </div>
      </article>
    `;
  });

  feedHtml += '</div>';
  app.innerHTML = feedHtml;
}

async function renderReader(app, slug) {
  const tabHome = document.getElementById('tab-home');
  if (tabHome) tabHome.classList.remove('active');

  const post = postsData.find(p => p.slug === slug) || postsData[0];
  const raw = await fetchMarkdown(post);
  const { meta, content } = parseFrontmatter(raw);

  const title = meta.title || post.title;
  const readTime = meta.readTime || post.readTime || '';
  const crossPostUrl = meta.crossPostUrl || post.crossPostUrl;

  const htmlBody = typeof marked !== 'undefined' ? marked.parse(content) : content;

  // Next post for reader footer
  const currentIndex = postsData.findIndex(p => p.slug === post.slug);
  const nextPost = postsData[(currentIndex + 1) % postsData.length];

  app.innerHTML = `
    <div class="medium-reader">
      <div class="reader-back-bar">
        <button class="reader-back-btn" id="reader-back-btn">
          <span>&larr;</span> All stories
        </button>
      </div>

      <header class="reader-article-header">
        <h1 class="reader-title">${title}</h1>
        ${crossPostUrl
      ? `<div class="reader-crosspost-notice"><em>Cross-posted from <a href="${crossPostUrl}" target="_blank" rel="noopener">MIT</a></em></div>`
      : ''
    }
        <div class="reader-meta-row">
          <span>${readTime}</span>
        </div>
      </header>

      <div class="blog-prose">
        ${htmlBody}
      </div>

      <footer class="reader-footer">
        <button class="reader-back-btn" id="reader-footer-back-btn">
          <span>&larr;</span> All stories
        </button>
        ${nextPost && nextPost.slug !== post.slug
      ? `<a href="#${nextPost.slug}" class="medium-read-link">Next: ${nextPost.title.length > 35 ? nextPost.title.slice(0, 35) + '&hellip;' : nextPost.title} &rarr;</a>`
      : ''
    }
      </footer>
    </div>
  `;

  const backBtn = document.getElementById('reader-back-btn');
  const footerBackBtn = document.getElementById('reader-footer-back-btn');
  if (backBtn) backBtn.addEventListener('click', navigateToFeed);
  if (footerBackBtn) footerBackBtn.addEventListener('click', navigateToFeed);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function render() {
  const app = document.getElementById('blog-app');
  if (!app) return;

  const hash = window.location.hash.replace('#', '').trim();
  if (hash && hash !== 'feed' && hash !== 'home') {
    await renderReader(app, hash);
  } else {
    renderFeed(app);
  }
}

async function initBlog() {
  try {
    const res = await fetch('posts/posts.json');
    if (res.ok) {
      postsData = await res.json();
    }
  } catch (e) {
    console.warn('Could not fetch posts.json, using fallback manifest', e);
  }

  const tabHome = document.getElementById('tab-home');
  if (tabHome) {
    tabHome.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToFeed();
    });
  }

  window.addEventListener('hashchange', render);
  render();
}

document.addEventListener('DOMContentLoaded', initBlog);
