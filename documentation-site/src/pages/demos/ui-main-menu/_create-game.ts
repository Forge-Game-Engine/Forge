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
  FontAtlas,
  FontAtlasCache,
  textHorizontalAlignments,
  textId,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  canvasId,
  createLabel,
  createUiCanvas,
  setUiFocus,
  UiAnchor,
  UiAxis,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { createFlagshipPanel } from './_create-flagship-panel';
import { createMainMenu } from './_create-main-menu';
import { fleetCommandPalette } from './_palette';

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
  backdropSprite.tintColor = fleetCommandPalette.void;

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
 * navigate focus, Enter/Space to submit) so both the main menu's rows and
 * the flagship panel's Deploy button are clickable, hoverable, and
 * keyboard/gamepad-focus-navigable, matching `ui-button`'s demo of the same
 * pattern.
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
 * Builds the "TSN Fleet Command" main-menu demo: the title lockup and
 * numbered menu from `createMainMenu`, plus a flagship readout card
 * (`createFlagshipPanel`) showing a fleet-strength meter and a Deploy
 * button. Selecting a menu row or invoking Deploy updates a shared status
 * label, and the first row ("Campaign") starts focused - matching the
 * reference design, where it's highlighted at rest rather than only once
 * the player has moved focus onto it.
 * @param fontAtlasUrl - The URL of the font atlas JSON to load.
 * @returns The created game.
 */
export const createUiMainMenuGame = async (
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
  const fontAtlas: FontAtlas = await fontAtlasCache.getOrLoad(fontAtlasUrl);

  const { mouseInputSource, submitInput, navigateInput } = createUiInputs(
    world,
    time,
    game,
  );

  const canvas = createUiCanvas(world, renderContext, time, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
    pointerSource: mouseInputSource,
    submitInput,
    navigateInput,
  });

  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );

  // Each "flavor" gets its own sprite from the same flat white image -
  // `rowSprite`/`buttonSprite` stay untinted since their visible color comes
  // entirely from the interactable they're attached to's own
  // `UiColorTransitionEcsComponent`; `panelSprite`/`trackSprite`/`fillSprite`
  // are non-interactive, so they carry a fixed tint set once, up front.
  const rowSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.ui,
  });
  const buttonSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.ui,
  });

  const panelSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.ui,
  });
  panelSprite.tintColor = new Color(
    fleetCommandPalette.panel.r,
    fleetCommandPalette.panel.g,
    fleetCommandPalette.panel.b,
    0.92,
  );

  const trackSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.ui,
  });
  trackSprite.tintColor = fleetCommandPalette.well;

  const fillSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.ui,
  });
  fillSprite.tintColor = fleetCommandPalette.blue;

  const statusLabelWidth = 720;

  const statusLabel = createLabel(world, canvas, {
    text: 'Click, or focus-navigate to, a menu item below',
    fontAtlas,
    size: 22,
    // See `ui-button`'s own demo for why a stretch-x anchor isn't used here
    // instead: `horizontalAlign: 'center'` re-centers within `maxWidth`,
    // measured from the label's own local x = 0, so a point anchor with a
    // left pivot - shifted left by half the label's width - keeps that
    // local origin on the box's actual left edge while still centering the
    // whole label on-screen.
    anchor: {
      x: UiAxis.point(0.5, { pivot: 0, size: statusLabelWidth }),
      y: UiAxis.point(0, { size: 36 }),
    },
    anchoredPosition: { x: -statusLabelWidth / 2, y: 36 },
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: textVerticalAlignments.middle,
    maxWidth: statusLabelWidth,
    color: fleetCommandPalette.ink,
    category: renderLayers.ui,
  });
  const statusText = world.getComponent(statusLabel, textId)!;

  const mainMenu = createMainMenu(
    world,
    canvas,
    fontAtlas,
    rowSprite,
    renderLayers.ui,
  );

  mainMenu.onSelect.registerListener((label) => {
    statusText.text = `Selected: ${label}`;
  });

  const flagshipPanel = createFlagshipPanel(
    world,
    canvas,
    fontAtlas,
    { panelSprite, trackSprite, fillSprite, buttonSprite },
    renderLayers.ui,
    0.72,
  );

  flagshipPanel.onDeploy.registerListener(() => {
    statusText.text = 'Deploying the TSN Vanguard...';
  });

  createLabel(world, canvas, {
    text: 'PILOT: CMDR. A. OKONJO',
    fontAtlas,
    size: 16,
    letterSpacing: 0.02,
    anchor: UiAnchor.bottomLeft({ x: 500, y: 24 }),
    anchoredPosition: { x: 80, y: 56 },
    verticalAlign: textVerticalAlignments.middle,
    color: fleetCommandPalette.ink,
    category: renderLayers.ui,
  });

  createLabel(world, canvas, {
    text: 'BUILD 0.9.14-RC2',
    fontAtlas,
    size: 14,
    letterSpacing: 0.02,
    anchor: UiAnchor.bottomLeft({ x: 400, y: 20 }),
    anchoredPosition: { x: 80, y: 28 },
    verticalAlign: textVerticalAlignments.middle,
    color: fleetCommandPalette.blue,
    category: renderLayers.ui,
  });

  const canvasComponent = world.getComponent(canvas, canvasId)!;

  setUiFocus(world, canvasComponent, mainMenu.rows[0].entity);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
