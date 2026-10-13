// Dev and test hooks: ?speed, ?seed, ?e2e (the automated playthrough) and the
// window.__vr / __battle / __t handles it drives the game through.

/**
 * True in the dev server and in the e2e build (`vite build --mode e2e`, the
 * production pipeline that `npm run e2e` plays); false in the public
 * production build. Vite replaces both values at build time, so the
 * production bundle drops whatever this guards. Read it at call time (tests
 * stub `DEV`).
 */
export function testHooks(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === "e2e";
}
