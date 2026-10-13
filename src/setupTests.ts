import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import './__mocks__/browserMocks';

// Mock for react-router
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: () => ({
      pathname: '/',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    }),
  };
});

// Mock for window.scrollTo
window.scrollTo = vi.fn();

// Mock for ResizeObserver (needed by Radix UI components)
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

// Pointer capture and scrollIntoView, which jsdom does not implement.
//
// Radix's Select calls these while opening, so without them any test that opens one dies
// on "target.hasPointerCapture is not a function" rather than on anything it meant to
// assert. Stubs rather than implementations: nothing under test depends on what they do,
// only on their existing.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => { };
  Element.prototype.releasePointerCapture = () => { };
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => { };
}

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
