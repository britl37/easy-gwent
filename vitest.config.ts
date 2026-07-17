import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@gwent/data': new URL('./packages/data/src/index.ts', import.meta.url).pathname,
      '@gwent/engine': new URL('./packages/engine/src/index.ts', import.meta.url).pathname,
      '@gwent/ai': new URL('./packages/ai/src/index.ts', import.meta.url).pathname,
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
  },
});
