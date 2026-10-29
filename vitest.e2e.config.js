// Vitest config for slow end-to-end tests (`npm run test:pdf`): they start Vite and a
// headless browser, so they are excluded from the default `npm test`.
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.e2e.test.js'],
        testTimeout: 300000,
        hookTimeout: 300000,
    },
});
