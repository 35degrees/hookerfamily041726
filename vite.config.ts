import adapter from '@sveltejs/adapter-vercel';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Person photos are requested as `/cld/<transform>/<v…/file>` (src/lib/photo.ts). On Vercel, vercel.json's
// rewrite sends that to Cloudinary and caches it at the edge; locally, this proxy does the same job.
const CLD_PROXY = {
	target: 'https://res.cloudinary.com',
	changeOrigin: true,
	rewrite: (p: string) => p.replace(/^\/cld\//, '/dc5clrqtw/image/upload/')
};

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
		watch: { ignored: ['**/static/data/**'] },
		proxy: { '/cld': CLD_PROXY }
	},
	// `npx vite preview` (Sam's LAN testing) needs the same /cld proxy as dev.
	preview: { proxy: { '/cld': CLD_PROXY } }
});
