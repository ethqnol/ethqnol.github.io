<script lang="ts">
	import { page } from '$app/stores';

	let filename = '';
	
	$: filename = ($page.params.img_src);
	
	function hash_code(str: string) {
        let hash = 0;
        for (let i = 0, len = str.length; i < len; i++) {
            let chr = str.charCodeAt(i);
            hash = (hash << 5) - hash + chr;
            hash |= 0; 
        }
        return hash;
    }
</script>

<svelte:head>
	<title>View {filename}</title>
</svelte:head>

<section>
	{#if filename}
		<img src={'/src/lib/images/planes/' + filename + ".JPG"} alt="Selected plane" class="full-view" />
		<a href={'/src/lib/images/planes/' + filename + ".JPG"} download={hash_code(filename).toString()  + hash_code(Date.now().toString()).toString()} class="download-btn">Download</a>
	{:else}
		<p>Image not found. {filename}</p>
	{/if}
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.full-view {
		max-width: 90vw;
		max-height: 80vh;
		margin-bottom: 1rem;
		border-radius: 1rem;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
	}

	.download-btn {
		padding: 0.5rem 1rem;
		background-color: #0066cc;
		color: white;
		border: none;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: bold;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.download-btn:hover {
		background-color: #004c99;
	}
</style>
