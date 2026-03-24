/**
 * Jest Setup File
 * 
 * Purpose: Configure Jest environment before running tests
 * Key Setup:
 * - Import testing library matchers
 * - Configure global test utilities
 * - Mock browser APIs if needed
 */

import '@testing-library/jest-dom';

/**
 * Mock window.matchMedia
 * Required for components that use media queries
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

/**
 * Mock IntersectionObserver
 * Required for lazy rendering and viewport detection
 */
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

/**
 * Mock ResizeObserver
 * Required for responsive components
 */
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

/**
 * Suppress console errors in tests (optional)
 * Uncomment to reduce noise in test output
 */
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args) => {
//     if (
//       typeof args[0] === 'string' &&
//       args[0].includes('Warning: ReactDOM.render')
//     ) {
//       return;
//     }
//     originalError.call(console, ...args);
//   };
// });

// afterAll(() => {
//   console.error = originalError;
// });
