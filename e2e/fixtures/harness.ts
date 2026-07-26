import type { CreateScene, SceneHandle } from './scenes/scene.js';

declare global {
  interface Window {
    // Browser-global test hook, following the conventional `__name__`
    // naming used to keep it visually distinct from real page globals -
    // not a class member, so the repo's leading-underscore-means-private
    // convention doesn't apply here.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __forgeTestHooks?: SceneHandle;
  }
}

// A failed scene otherwise leaves a blank canvas, which is visually
// identical to a scene that loaded fine but hasn't had step() called on it
// yet (nothing draws until a spec - or a human - drives a frame). Render the
// failure directly into the page, in addition to console.error, so opening
// the harness URL by hand is self-diagnosing instead of just showing white.
function renderFatalError(message: string): void {
  const container = document.getElementById('app') ?? document.body;

  container.textContent = '';

  const pre = document.createElement('pre');

  pre.style.cssText =
    'margin:0; padding:1rem; color:#f88; background:#200; ' +
    'white-space:pre-wrap; font:13px monospace;';
  pre.textContent = message;

  container.appendChild(pre);
}

try {
  // Loaded eagerly so Vite can statically discover every scene module; the
  // matching entry is picked at runtime by the `?scene=` query param.
  const sceneLoaders = import.meta.glob<{ createScene: CreateScene }>(
    './scenes/*.ts',
  );

  const sceneName = new URLSearchParams(window.location.search).get('scene');

  if (!sceneName) {
    throw new Error(
      'Missing required "scene" query param, e.g. ?scene=camera-pan-zoom',
    );
  }

  // `sceneName` comes from the URL, so it's validated against the glob's own
  // (build-time, not user-controlled) keys before it's used to select which
  // loader to invoke, rather than only checking the looked-up value
  // afterwards - the latter is indistinguishable from an unvalidated
  // dynamic dispatch to static analysis, even though the outcome is the
  // same.
  const sceneKey = `./scenes/${sceneName}.ts`;

  if (!Object.hasOwn(sceneLoaders, sceneKey)) {
    throw new Error(`Unknown scene "${sceneName}"`);
  }

  const container = document.getElementById('app');

  if (!container) {
    throw new Error('Missing #app container element');
  }

  const { createScene } = await sceneLoaders[sceneKey]();

  window.__forgeTestHooks = createScene(container);
} catch (error) {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);

  console.error('[forge e2e harness] scene failed to load:', error);
  renderFatalError(`Scene failed to load:\n\n${message}`);

  throw error;
}
