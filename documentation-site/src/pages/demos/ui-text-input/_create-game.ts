import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import defaultFontImageUrl from '@forge-game-engine/forge/fonts/default/default.png';
import {
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
  Color,
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createTexture,
  createPresentEcsSystem,
  createRenderEcsSystem,
  getCameraView,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
  textHorizontalAlignments,
  textId,
} from '@forge-game-engine/forge/text';
import {
  canvasId,
  createButton,
  createLabel,
  createTextInput,
  createUiCanvas,
  registerUiSystems,
  setTextInputValue,
  setUiFocus,
  UiAnchor,
  UiAxis,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

const textColor = new Color(0.12, 0.12, 0.16, 1);
const fieldWidth = 640;

async function createBackdrop(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
  whiteSprite: SpriteEcsComponent,
): Promise<void> {
  const { x: width, y: height } = getCameraView(
    world,
    camera,
    renderContext,
  ).size;

  const backdrop = world.createEntity();

  addPositionComponent(world, backdrop);
  addSpriteComponent(world, backdrop, {
    ...whiteSprite,
    width,
    height,
    tintColor: new Color(0.09, 0.11, 0.16, 1),
  });
}

/**
 * Wires a `MouseInputSource` and a `KeyboardInputSource`: the arrow keys
 * navigate UI focus and Enter submits the focused element. Keys typed into
 * a text field never reach these bindings.
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
  const navigateInput = new Axis2dAction('ui-navigate');

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

  return { mouseInputSource, submitInput, navigateInput };
}

/** Keeps letters and digits, upper-cased: a badge code like "AX7Q". */
const badgeFilter = (text: string): string =>
  text.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Drops leading spaces, so a name can't start with one. */
const nameFilter = (text: string): string => text.replace(/^ +/, '');

/**
 * Builds the text input demo: a name entry form with two text fields
 * (`createTextInput`) and a "Log in" button. Click or tap a field, or
 * focus it with the arrow keys and press Enter, to type into it. Enter
 * submits the field and Escape cancels it. Keys typed into a field don't
 * reach the UI's arrow-key navigation or its Enter binding, so they don't
 * move UI focus or press the focused button.
 * @returns The created game.
 */
export const createTextInputGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const createWhiteSprite = (category: number): SpriteEcsComponent => ({
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category,
  });

  await createBackdrop(
    world,
    camera,
    renderContext,
    createWhiteSprite(renderLayers.world),
  );

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
  const panelSprite = {
    ...createImageSprite(createTexture(renderContext, panelImage), {
      pixelsPerUnit: 1,
      slices: {
        left: 26,
        right: 26,
        top: 26,
        bottom: 26,
        nativeWidth: 96,
        nativeHeight: 96,
      },
    }),
    category: renderLayers.ui,
  };
  const fillSprite = createWhiteSprite(renderLayers.ui);

  const transition = {
    normalColor: Color.white,
    hoverColor: new Color(0.85, 0.85, 0.85, 1),
    pressedColor: new Color(0.65, 0.65, 0.65, 1),
    disabledColor: new Color(0.5, 0.5, 0.5, 0.6),
  };

  const fieldOptions = {
    renderContext,
    sprite: panelSprite,
    fillSprite,
    fontAtlas,
    size: 38,
    padding: 28,
    textColor,
    caretColor: textColor,
    category: renderLayers.ui,
    transition,
  };

  const createFieldLabel = (text: string, y: number): void => {
    createLabel(world, canvas, {
      text,
      fontAtlas,
      size: 28,
      // A label's text starts at its pivot, so a left pivot lines it up
      // with the field's left edge.
      anchor: {
        x: UiAxis.point(0.5, { pivot: 0, size: fieldWidth }),
        y: UiAxis.point(0.5, { size: 30 }),
      },
      anchoredPosition: { x: -fieldWidth / 2, y },
      color: new Color(0.7, 0.75, 0.85, 1),
      category: renderLayers.ui,
    });
  };

  createFieldLabel('PILOT NAME', 270);

  const nameField = createTextInput(world, canvas, {
    ...fieldOptions,
    anchor: UiAnchor.center({ x: fieldWidth, y: 88 }),
    anchoredPosition: { x: 0, y: 190 },
    placeholder: 'Your name',
    maxLength: 16,
    filter: nameFilter,
    attributes: { ariaLabel: 'Pilot name', autocapitalize: 'words' },
  });

  createFieldLabel('BADGE NUMBER', 100);

  const badgeField = createTextInput(world, canvas, {
    ...fieldOptions,
    anchor: UiAnchor.center({ x: fieldWidth, y: 88 }),
    anchoredPosition: { x: 0, y: 20 },
    placeholder: 'AX7Q',
    maxLength: 6,
    filter: badgeFilter,
    attributes: {
      ariaLabel: 'Badge number',
      autocapitalize: 'characters',
      autocomplete: 'off',
    },
  });

  const logInButton = createButton(world, canvas, {
    anchor: UiAnchor.center({ x: 300, y: 80 }),
    anchoredPosition: { x: 0, y: -130 },
    sprite: panelSprite,
    label: 'Log in',
    fontAtlas,
    labelSize: 32,
    labelColor: textColor,
    labelCategory: renderLayers.ui,
    transition,
  });

  const statusLabel = createLabel(world, canvas, {
    text: 'Click a field and type',
    fontAtlas,
    size: 30,
    // `horizontalAlign: 'center'` centers within `maxWidth` measured from
    // the label's pivot, so the pivot sits at the box's left edge.
    anchor: {
      x: UiAxis.point(0.5, { pivot: 0, size: 900 }),
      y: UiAxis.point(0.5, { size: 40 }),
    },
    anchoredPosition: { x: -450, y: -230 },
    horizontalAlign: textHorizontalAlignments.center,
    maxWidth: 900,
    color: Color.white,
    category: renderLayers.ui,
  });
  const statusText = world.getComponent(statusLabel, textId)!;

  nameField.onSubmit.registerListener((name) => {
    statusText.text = `Name entered: ${name}`;
  });
  badgeField.onSubmit.registerListener((badge) => {
    statusText.text = `Badge entered: ${badge}`;
  });
  nameField.onCancel.registerListener(() => {
    statusText.text = 'Name editing cancelled';
  });
  badgeField.onCancel.registerListener(() => {
    statusText.text = 'Badge editing cancelled';
  });

  logInButton.onInvoke.registerListener(() => {
    const name = nameField.textInput.value;
    const badge = badgeField.textInput.value;

    statusText.text =
      name && badge
        ? `Welcome aboard, ${name} (${badge})`
        : 'Enter a name and a badge number';

    if (name && badge) {
      setTextInputValue(world, badgeField.entity, '');
    }
  });

  // Starts with the button focused, so Enter outside a field presses it.
  setUiFocus(
    world,
    world.getComponentRequired(canvas, canvasId),
    logInButton.entity,
  );

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
