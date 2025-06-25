// src/utils/storybook-test-utils.ts
import { render } from '@testing-library/vue';
import { vi, describe, it } from 'vitest';

/**
 * Renders a Storybook story as a testable component
 * @param Story - The Storybook story object
 * @param options - Optional testing configuration
 * @returns Test utilities and mock functions
 */
export const renderStory = async (Story, options = {}) => {
  // Extract args from the story
  const { args } = Story;

  // Create mocks for the standard events/actions
  const mocks = {
    save: vi.fn(),
    'update:modelValue': vi.fn(),
    close: vi.fn(),
    submit: vi.fn(),
    change: vi.fn(),
    input: vi.fn(),
    click: vi.fn(),
    // Add any other common actions your stories might use
    ...((options as any).mocks || {})
  };

  // Add the mocks to the args
  const props = {
    ...args,
    ...mocks,
    ...((options as any).props || {})
  };

  // Get the component to render - for Storybook 7+ stories
  const Component = Story.Component || Story.component;

  if (!Component) {
    throw new Error(`No component found in story: ${Story.name || 'Unknown'}`);
  }

  // Render the component with the story's args
  const result = render(Component, {
    props,
    ...((options as any).renderOptions || {})
  });

  // Return useful things for testing
  return {
    ...result,
    mocks,
    // Helper to run the play function if it exists
    async runPlay() {
      if (Story.play) {
        await Story.play({
          canvasElement: result.container,
          args: props,
          ...((options as any).playOptions || {})
        });
      }
      return result;
    }
  };
};

/**
 * Helper to create UI test specs from Storybook stories
 * 
 * @param title - Test suite title
 * @param stories - Object containing stories to test
 * @param testFn - Custom test function
 */
export const testStories = (title, stories, testFn) => {
  describe(title, () => {
    // Skip the default export which is the component meta
    const storyEntries = Object.entries(stories).filter(([key]) => key !== 'default');

    // Run a test for each story
    storyEntries.forEach(([storyName, Story]) => {
      it(`${storyName} story`, async () => {
        await testFn(Story, storyName);
      });
    });
  });
};
