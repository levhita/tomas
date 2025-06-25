// src/components/modals/__tests__/AccountModal.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import * as stories from '../AccountModal.stories';
import AccountModal from '../AccountModal.vue';

// Create a test suite for each story
describe('AccountModal Stories', () => {
  // Get all stories except the default export
  const storyEntries = Object.entries(stories).filter(([key]) => key !== 'default');

  // Test each story by running its play function
  storyEntries.forEach(([storyName, Story]) => {
    it(`${storyName} story runs properly`, async () => {
      // The story should work in the test environment
      if (typeof Story.play === 'function') {
        // Create a canvas element for testing
        const container = document.createElement('div');

        // Create mock args with mocked event handlers
        const args = {
          ...Story.args,
          save: expect.any(Function),
          'update:modelValue': expect.any(Function)
        };

        // Run the play function with the test environment
        await Story.play({ canvasElement: container, args });
      }
    });
  });
});
