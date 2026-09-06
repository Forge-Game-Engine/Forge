import {
  createTransformEcsSystem,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  MouseInputSource,
  registerInputs,
} from '@forge-game-engine/forge/input';
import {
  Color,
  createCamera,
  createCameraEcsSystem,
  createPresentEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
} from '@forge-game-engine/forge/text';
import { createUiCanvas } from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createCornerDecorations } from './_create-corner-decorations';
import { createOptionsContent } from './_create-options-content';
import { createTitleBar } from './_create-title-bar';
import { createWindowFrame } from './_create-window-frame';
import { createLiveMotionEcsSystem } from './_live-motion.system';
import { loadDemoSprites } from './_load-demo-sprites';

// Forge doesn't ship a reserved "UI" render category - each game picks its
// own bit and reuses it for the UI canvas's cullingMask and every UI
// visual's own category, so it's this demo's choice, not the engine's,
// which bit separates the world camera from the UI camera.
const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

const textColor = new Color(0.86, 0.88, 0.94, 1);
const mutedTextColor = new Color(0.6, 0.63, 0.72, 1);

function createPointerInput(
  world: EcsWorld,
  time: Time,
  game: Game,
): MouseInputSource {
  const inputManager = registerInputs(world, time, {});

  return new MouseInputSource(inputManager, game.container);
}

/**
 * Builds the nested resize demo, dressed up to read as a basic options
 * menu: a window panel whose `RectTransformEcsComponent`'s own size (`x`/`y`) *and*
 * `anchoredPosition` `createLiveMotionEcsSystem` oscillates every frame (see
 * `_live-motion.system.ts`), with nested children reacting to that
 * resize/move purely through their own anchors - no code anywhere reacts to
 * it directly except the window panel itself:
 *
 * - Level 2: a `stretchAll` content panel that fills the window (inset by a
 *   fixed margin), resizing on both axes every frame. It hosts the actual
 *   "options" built by `createOptionsContent` - a Music volume slider and a
 *   Fullscreen toggle.
 * - Level 3: a `stretchTop` title bar (`createTitleBar`) nested *inside* the
 *   content panel - two levels of stretch-through-nesting - that resizes
 *   its width only, following whatever width the content panel (and in
 *   turn the window) currently has.
 * - Level 4: a point-anchored (`middleRight`) close button nested *inside*
 *   that title bar: its own size never changes, but it still slides along
 *   with the title bar's right edge as the title bar's (and in turn the
 *   content panel's, and in turn the window's) width changes - a point
 *   anchor still resolves correctly this many levels deep.
 * - Level 2 (sibling): a version tag (`createCornerDecorations`) parented
 *   directly to the window panel: its own size never changes, but
 *   `createUiLayoutEcsSystem` still repositions it every frame to stay
 *   pinned to its corner as the window's edges move.
 * @param fontAtlasUrl - The URL of the font atlas JSON to load.
 * @returns The created game.
 */
export const createNestedResizeGame = async (
  fontAtlasUrl: string,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const fontAtlasCache = new FontAtlasCache(renderContext.imageCache);
  const fontAtlas: FontAtlas = await fontAtlasCache.getOrLoad(fontAtlasUrl);

  const mouseInputSource = createPointerInput(world, time, game);

  // Registered before `createUiCanvas` (which registers
  // `createUiLayoutEcsSystem` internally) so the outer panel's resized/moved
  // size (`x`/`y`)/`anchoredPosition` are already up to date by the time
  // layout resolves every rect this same frame - see
  // `_live-motion.system.ts`'s own doc comment.
  world.addSystem(createLiveMotionEcsSystem(time));

  const canvas = createUiCanvas(world, renderContext, time, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
    pointerSource: mouseInputSource,
  });

  const sprites = await loadDemoSprites(renderContext, renderLayers.ui);

  const { windowPanel, content } = createWindowFrame(world, canvas, sprites);

  createTitleBar(
    world,
    content,
    fontAtlas,
    sprites,
    textColor,
    renderLayers.ui,
  );
  createCornerDecorations(
    world,
    windowPanel,
    fontAtlas,
    sprites,
    mutedTextColor,
    renderLayers.ui,
  );
  createOptionsContent(
    world,
    content,
    fontAtlas,
    sprites,
    textColor,
    renderLayers.ui,
  );

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
