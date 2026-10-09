import adapter from '@sveltejs/adapter-vercel';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Vercel, chosen explicitly (100926) rather than detected by adapter-auto. The functions run in
			// pdx1 because Neon lives in us-west-2: the only routes that touch the database (/, /api/*) are
			// then one region-local hop from it. Static payloads are served by the CDN and never reach here.
			adapter: adapter({ runtime: 'nodejs22.x', regions: ['pdx1'] })
		})
	],
	server: {
		// static/data/ holds ~14,800 generated payloads rebuilt by regenerate-data.js
		// on every batch. They're served as static assets and never need HMR — watching
		// them swamps Vite's file watcher and wedges the SSR module runner (the
		// "transport invoke timed out … fetchModule" 500s). Ignore them from the watcher.
		watch: { ignored: ['**/static/data/**'] }
	}
});
