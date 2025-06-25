/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/**
 * Creates an exclusion pattern for Vitest based on the inclusion list
 * @param {string[]} includeList - Array of story file paths to include
 * @returns {string} - A negated pattern for the exclude array
 */

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [vue(), basicSsl({
    name: 'yamo'
  })],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000/api/',
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  },
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
            tags: {
              include: ['stable', 'testable'],
            }
          })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{
              browser: 'chromium'
            }]
          },
          setupFiles: ['.storybook/vitest.setup.js']
        }
      },
    ]
  }
});