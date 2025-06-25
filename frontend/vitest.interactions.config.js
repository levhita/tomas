import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/components/**/__tests__/**/*.test.{js,ts,jsx,tsx}'],
    setupFiles: ['./.storybook/test-setup.js'],
    deps: {
      inline: [/storybook-vue3/]
    }
  }
});
