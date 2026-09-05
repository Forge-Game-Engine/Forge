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
  createButton,
  createLabel,
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

/**
 * Wires a `MouseInputSource` and a `KeyboardInputSource` (arrow keys to
 * navigate focus, Enter/Space to submit) so the three buttons below are
 * both clickable and gamepad/keyboard-focus-navigable.
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
 * Builds the button demo: three stacked buttons (`createButton`), each
 * hoverable, clickable, and keyboard/gamepad-focus-navigable - the arrow
 * keys move focus between them (top-to-bottom, matching their on-screen
 * order), and Enter/Space (or a click) raises the same `onInvoke` either
 * path, updating a status label with which one was last invoked. Hovering
 * a button also focuses it, so the highlight follows the mouse the same
 * way it follows the keyboard.
 * @param fontAtlasUrl - The URL of the font atlas JSON to load.
 * @returns The created game.
 */
export const createButtonGame = async (fontAtlasUrl: string): Promise<Game> => {
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

  const buttonTransition = {
    normalColor: Color.white,
    hoverColor: new Color(0.85, 0.85, 0.85, 1),
    pressedColor: new Color(0.65, 0.65, 0.65, 1),
    disabledColor: new Color(0.5, 0.5, 0.5, 0.6),
  };

  const statusLabelWidth = 600;

  const statusLabel = createLabel(world, canvas, {
    text: 'Click, or focus-navigate to, a button below',
    fontAtlas,
    size: 26,
    // `horizontalAlign: 'center'` re-centers the text within `maxWidth`,
    // measured from the label's own local x = 0 (see `createButton`'s doc
    // comment on this same pitfall) - `UiAnchor.topCenter`'s pivot sits at
    // the rect's center, which would offset that alignment box off to one
    // side. Anchoring at the canvas's top-center point but with a left
    // pivot, then shifting left by half the label's width, keeps local
    // x = 0 on the box's actual left edge while still centering it
    // on-screen.
    anchor: {
      anchorMin: { x: 0.5, y: 1 },
      anchorMax: { x: 0.5, y: 1 },
      pivot: { x: 0, y: 1 },
    },
    anchoredPosition: { x: -statusLabelWidth / 2, y: -60 },
    sizeOrMargin: { x: statusLabelWidth, y: 40 },
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: textVerticalAlignments.middle,
    maxWidth: statusLabelWidth,
    color: Color.white,
    category: renderLayers.ui,
  });
  const statusText = world.getComponent(statusLabel, textId)!;

  const buttonY = [80, 0, -80];
  const labels = ['Play', 'Options', 'Quit'];

  for (let i = 0; i < labels.length; i++) {
    const button = createButton(world, canvas, {
      anchor: UiAnchor.center,
      anchoredPosition: { x: 0, y: buttonY[i] },
      sizeOrMargin: { x: 260, y: 64 },
      sprite: panelSprite,
      label: labels[i],
      fontAtlas,
      labelSize: 26,
      labelColor: textColor,
      labelCategory: renderLayers.ui,
      transition: buttonTransition,
    });

    const label = labels[i];

    button.onInvoke.registerListener(() => {
      statusText.text = `Invoked: ${label}`;
    });
  }

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
