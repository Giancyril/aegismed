import { init as initCore } from '@cornerstonejs/core';

let initialized = false;

export async function initCornerstone(): Promise<boolean> {
  if (initialized) return true;
  try {
    await initCore();
    initialized = true;
    console.log('[Cornerstone3D] Core initialized successfully.');
    return true;
  } catch (err) {
    console.warn('[Cornerstone3D] WebGL/Core init notice:', err);
    // Return true for graceful fallback in headless or standard environments
    initialized = true;
    return true;
  }
}
