import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';

const standalone = process.env.VITE_STANDALONE === '1';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: standalone
			? adapterStatic({ pages: 'build-standalone', assets: 'build-standalone', fallback: 'index.html' })
			: adapterNode()
	}
};

export default config;
