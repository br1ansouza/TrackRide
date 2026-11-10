import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	timeout: 60000,
	expect: { timeout: 15000 },
	workers: 1,
	use: {
		serviceWorkers: 'block',
		baseURL: process.env.TRACKRIDE_E2E_URL ?? 'http://127.0.0.1:5174',
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
		launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
			? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
			: {}
	},
	webServer: process.env.TRACKRIDE_E2E_URL
		? undefined
		: {
				command: 'npm run dev -- --host 127.0.0.1 --port 5174',
				url: 'http://127.0.0.1:5174/login',
				timeout: 60000,
				env: { VITE_API_URL: 'http://127.0.0.1:3000' }
			}
});
