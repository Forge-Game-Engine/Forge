import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  MouseInputSource,
  registerInputs,
} from '@forge-game-engine/forge/input';
import {
  addSpriteComponent,
  calculateVisibleWorldSize,
  Color,
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createPresentEcsSystem,
  createRenderEcsSystem,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
  textHorizontalAlignments,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  addUiToggleGroupComponent,
  createLabel,
  createToggle,
  createUiCanvas,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

const textColor = new Color(0.12, 0.12, 0.16, 1);

async function createBackdrop(
  world: EcsWorld,
  renderContext: RenderContext,
): Promise<void> {
  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );
  const backdropSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.world,
  });
  backdropSprite.tintColor = new Color(0.09, 0.11, 0.16, 1);

  const { x: width, y: height } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );

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
 * Builds the toggle demo: a lone checkbox-style toggle (`createToggle`, no
 * `group`, flips freely) and a three-way radio group
 * (`addUiToggleGroupComponent` shared across three toggles) - clicking one
 * radio option turns off whichever was previously on, since a group always
 * has exactly one selection (`allowSwitchOff: false`, the default).
 * @param fontAtlasUrl - The URL of the font atlas JSON to load.
 * @returns The created game.
 */
export const createToggleGame = async (fontAtlasUrl: string): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createBackdrop(world, renderContext);

  const fontAtlasCache = new FontAtlasCache(renderContext.imageCache);
  const fontAtlas: FontAtlas = await fontAtlasCache.getOrLoad(fontAtlasUrl);

  const mouseInputSource = createPointerInput(world, time, game);

  const canvas = createUiCanvas(world, renderContext, time, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
    pointerSource: mouseInputSource,
  });

  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );
  const crossImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/space-shooter/icon_crossSmall.png'),
  );

  const boxColor = new Color(0.85, 0.85, 0.88, 1);
  const accentColor = new Color(0.35, 0.55, 0.95, 1);

  const boxSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.ui,
  });
  boxSprite.tintColor = boxColor;

  const crossSprite = createImageSprite(crossImage, renderContext, {
    layer: renderLayers.ui,
  });
  crossSprite.tintColor = accentColor;

  const boxTransition = {
    normalColor: boxColor,
    hoverColor: new Color(0.78, 0.78, 0.83, 1),
    pressedColor: new Color(0.68, 0.68, 0.75, 1),
    disabledColor: new Color(0.6, 0.6, 0.6, 0.6),
  };

  // A topLeft-anchored label's `verticalAlign: middle` centers its ink on
  // the rect's pivot line - its `anchoredPosition.y` itself, not the middle
  // of its (otherwise-unused, for a caption) `sizeOrMargin` box. So to land a
  // caption's vertical center on a same-row toggle's center, its y must be
  // offset down by half the toggle's height, not simply match the toggle's
  // own (top-edge) anchoredPosition.y.
  const toggleSize = 32;
  const rowCenterY = (toggleTopY: number): number =>
    toggleTopY - toggleSize / 2;

  const caption = (
    text: string,
    anchoredPosition: { x: number; y: number },
  ): void => {
    createLabel(world, canvas, {
      text,
      fontAtlas,
      size: 26,
      anchor: UiAnchor.topLeft,
      anchoredPosition,
      verticalAlign: textVerticalAlignments.middle,
      color: Color.white,
      category: renderLayers.ui,
    });
  };

  const muteToggleY = -80;

  caption('Mute', { x: 60, y: rowCenterY(muteToggleY) });

  createToggle(world, canvas, {
    sprite: { ...boxSprite },
    checkmarkSprite: { ...crossSprite },
    anchor: UiAnchor.topLeft,
    anchoredPosition: { x: 240, y: muteToggleY },
    transition: boxTransition,
  });

  const difficultyToggleY = -220;

  caption('Difficulty', { x: 60, y: rowCenterY(difficultyToggleY) });

  const difficultyGroup = world.createEntity();

  addUiToggleGroupComponent(world, difficultyGroup);

  const difficulties = ['Easy', 'Medium', 'Hard'];

  for (let i = 0; i < difficulties.length; i++) {
    createToggle(world, canvas, {
      sprite: boxSprite,
      checkmarkSprite: crossSprite,
      group: difficultyGroup,
      isOn: i === 0,
      anchor: UiAnchor.topLeft,
      anchoredPosition: { x: 240 + i * 90, y: difficultyToggleY },
      transition: boxTransition,
    });

    createLabel(world, canvas, {
      text: difficulties[i],
      fontAtlas,
      size: 20,
      anchor: UiAnchor.topLeft,
      anchoredPosition: { x: 236 + i * 90, y: -262 },
      horizontalAlign: textHorizontalAlignments.center,
      sizeOrMargin: { x: 60, y: 30 },
      color: Color.white,
      category: renderLayers.ui,
    });
  }

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
