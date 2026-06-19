import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		// static/data/ holds ~14,800 generated payloads rebuilt by regenerate-data.js
		// on every batch. They're served as static assets and never need HMR — watching
		// them swamps Vite's file watcher and wedges the SSR module runner (the
		// "transport invoke timed out … fetchModule" 500s). Ignore them from the watcher.
		watch: { ignored: ['**/static/data/**'] }
	}
});
