// Cornerstone3D is loaded lazily / on-demand when a real DICOM volume is
// available. For the local dev environment the SVG-based viewport renders
// anatomy directly, so we provide a no-op initializer here.

let initialized = false;

export async function initCornerstone(): Promise<boolean> {
  if (initialized) return true;
  initialized = true;
  // Real init (WebGL + SharedArrayBuffer) is deferred until a DICOM series is
  // loaded via the upload modal. This keeps the initial render crash-free.
  console.log('[Cornerstone3D] Deferred -- will init on first DICOM load.');
  return true;
}
