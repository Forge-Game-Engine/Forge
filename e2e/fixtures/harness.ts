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

const loadScene = sceneLoaders[`./scenes/${sceneName}.ts`];

if (!loadScene) {
  throw new Error(`Unknown scene "${sceneName}"`);
}

const container = document.getElementById('app');

if (!container) {
  throw new Error('Missing #app container element');
}

const { createScene } = await loadScene();

window.__forgeTestHooks = createScene(container);
