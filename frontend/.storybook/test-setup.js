// .storybook/test-setup.js
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Expose vitest globals that Storybook interactions might need
window.vi = vi;

// Mock the global fetch function if needed for your tests
global.fetch = vi.fn();

// Setup any global mocks or utilities needed for your tests
window.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia for responsive stories if needed
window.matchMedia = window.matchMedia || function () {
  return {
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };
};

// Mock Storybook's events and channels
window.__STORYBOOK_PREVIEW__ = {
  channel: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }
};
