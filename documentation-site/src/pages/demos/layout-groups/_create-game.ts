import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  actionResetTypes,
  Axis2dAction,
  buttonMoments,
  KeyboardAxis2dBinding,
  keyCodes,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  MouseInputSource,
  registerInputs,
  TriggerAction,
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
  FontAtlasCache,
} from '@forge-game-engine/forge/text';
import {
  createUiCanvas,
  registerUiSystems,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { createInventoryGrid } from './_create-inventory-grid';
import { createMenu } from './_create-menu';
import { createOptionsForm } from './_create-options-form';
import { createToolbar } from './_create-toolbar';

// Forge doesn't ship a reserved "UI" render category - each game picks its
// own bit and reuses it for the UI canvas's cullingMask and every UI
// visual's own category, so it's this demo's choice, not the engine's,
// which bit separates the world camera from the UI camera.
const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

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

/**
 * Wires a `MouseInputSource` and a `KeyboardInputSource` (arrow keys to
 * navigate focus, Enter/Space to submit) so every interactable across all
 * four panels - the Menu's buttons, and the Options panel's slider/toggle -
 * is clickable, hoverable, and keyboard/gamepad-focus-navigable, matching
 * `ui-button`'s demo of the same pattern.
 */
function createUiInputs(
  world: EcsWorld,
  time: Time,
  game: Game,
): {
  mouseInputSource: MouseInputSource;
  submitInput: TriggerAction;
  navigateInput: Axis2dAction;
} {
  const submitInput = new TriggerAction('ui-submit');
  const navigateInput = new Axis2dAction(
    'ui-navigate',
    undefined,
    actionResetTypes.noReset,
  );

  const inputManager = registerInputs(world, time, {
    triggerActions: [submitInput],
    axis2dActions: [navigateInput],
  });

  const mouseInputSource = new MouseInputSource(inputManager, game.container);
  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.axis2dBindings.add(
    new KeyboardAxis2dBinding(
      navigateInput,
      keyCodes.arrowUp,
      keyCodes.arrowDown,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );

  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(submitInput, keyCodes.enter, buttonMoments.down),
  );
  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(submitInput, keyCodes.space, buttonMoments.down),
  );

  return { mouseInputSource, submitInput, navigateInput };
}

/**
 * Builds the layout groups demo: four independent panels - a "Menu"
 * (`VerticalLayoutGroupEcsComponent` + `ContentSizeFitterEcsComponent`), a
 * "Toolbar" (`HorizontalLayoutGroupEcsComponent`), an "Inventory"
 * (`GridLayoutGroupEcsComponent` with fixed `cellSize` cells), and an
 * "Options" form (`GridLayoutGroupEcsComponent` with `columnWidthMode:
 * 'content'`) - each arranging its own children with no manual
 * `anchoredPosition`/size bookkeeping. Every interactable
 * (the Menu's buttons, the Options panel's Music slider and Fullscreen
 * toggle) is clickable and keyboard/gamepad-focus-navigable via
 * `createUiInputs`.
 * @param fontAtlasUrl - The URL of the font atlas JSON to load.
 * @returns The created game.
 */
export const createLayoutGroupsGame = async (
  fontAtlasUrl: string,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createBackdrop(world, renderContext);

  const fontAtlasCache = new FontAtlasCache(renderContext.imageCache);
  const fontAtlas = await fontAtlasCache.getOrLoad(fontAtlasUrl);

  const { mouseInputSource, submitInput, navigateInput } = createUiInputs(
    world,
    time,
    game,
  );

  registerUiSystems(world, renderContext, time, {
    pointerSource: mouseInputSource,
  });

  const canvas = createUiCanvas(world, renderContext, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
    submitInput,
    navigateInput,
  });

  const panelImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/kenney_fantasy-ui-borders/PNG/Double/Panel/panel-030.png'),
  );
  const panelSprite = createImageSprite(panelImage, renderContext, {
    layer: renderLayers.ui,
    slices: {
      left: 26,
      right: 26,
      top: 26,
      bottom: 26,
      nativeWidth: 96,
      nativeHeight: 96,
    },
  });

  createMenu(world, canvas, fontAtlas, panelSprite, renderLayers.ui);
  await createToolbar(
    world,
    renderContext,
    canvas,
    fontAtlas,
    panelSprite,
    renderLayers.ui,
  );
  await createInventoryGrid(
    world,
    renderContext,
    canvas,
    fontAtlas,
    panelSprite,
    renderLayers.ui,
  );
  await createOptionsForm(
    world,
    renderContext,
    canvas,
    fontAtlas,
    panelSprite,
    renderLayers.ui,
  );

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
