import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import defaultFontImageUrl from '@forge-game-engine/forge/fonts/default/default.png';
import {
  MouseInputSource,
  registerInputs,
} from '@forge-game-engine/forge/input';
import {
  addSpriteComponent,
  Color,
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createPresentEcsSystem,
  createRenderEcsSystem,
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
} from '@forge-game-engine/forge/text';
import {
  createDropdown,
  createUiCanvas,
  registerUiSystems,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

const textColor = new Color(0.12, 0.12, 0.16, 1);

async function createBackdrop(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
): Promise<void> {
  const backdropSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.world,
  };
  backdropSprite.tintColor = new Color(0.09, 0.11, 0.16, 1);

  const { x: width, y: height } = getCameraView(
    world,
    camera,
    renderContext,
  ).size;

  backdropSprite.width = width;
  backdropSprite.height = height;

  const backdrop = world.createEntity();

  addPositionComponent(world, backdrop);
  addSpriteComponent(world, backdrop, backdropSprite);
}

function createPointerInput(
  world: EcsWorld,
  time: Time,
  game: Game,
): MouseInputSource {
  const inputManager = registerInputs(world, time, {});

  return new MouseInputSource(inputManager, game.container);
}

/**
 * Builds the dropdown demo: a single `createDropdown` showing the selected
 * option in its header, with a click-to-open list of option rows below it -
 * each an ordinary `createButton`. Selecting an option updates the header's
 * label, raises `onValueChanged`, and closes the list.
 * @returns The created game.
 */
export const createDropdownGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createBackdrop(world, camera, renderContext);

  const fontAtlasCache = new FontAtlasCache(renderContext);
  const fontAtlas: FontAtlas = await fontAtlasCache.getOrLoad({
    // Importing the JSON would give its parsed contents, so `new URL` asks
    // webpack for its URL instead.
    metricsUrl: new URL(
      '@forge-game-engine/forge/fonts/default/default.json',
      import.meta.url,
    ).href,
    imageUrl: defaultFontImageUrl,
  });

  const mouseInputSource = createPointerInput(world, time, game);

  registerUiSystems(world, renderContext, time, {
    pointerSource: mouseInputSource,
  });

  const canvas = createUiCanvas(world, renderContext, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
  });

  const boxColor = new Color(0.85, 0.85, 0.88, 1);
  const boxSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.ui,
  };
  boxSprite.tintColor = boxColor;

  const boxTransition = {
    normalColor: boxColor,
    hoverColor: new Color(0.78, 0.78, 0.83, 1),
    pressedColor: new Color(0.68, 0.68, 0.75, 1),
    disabledColor: new Color(0.6, 0.6, 0.6, 0.6),
  };

  createDropdown(world, canvas, {
    headerSprite: boxSprite,
    optionSprite: boxSprite,
    options: ['Low', 'Medium', 'High', 'Ultra'],
    fontAtlas,
    labelColor: textColor,
    labelCategory: renderLayers.ui,
    anchor: UiAnchor.center({ x: 320, y: 56 }),
    anchoredPosition: { x: 0, y: 100 },
    selectedIndex: 2,
    transition: boxTransition,
  });

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
