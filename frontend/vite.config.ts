import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const standalone = process.env.VITE_STANDALONE === '1';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: standalone
				? adapterStatic({
						pages: 'build-standalone',
						assets: 'build-standalone',
						fallback: 'index.html'
					})
				: adapterCloudflare()
		})
	]
});
