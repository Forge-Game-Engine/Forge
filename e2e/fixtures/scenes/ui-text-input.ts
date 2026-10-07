import fontImageUrl from '../../../assets/fonts/default/default.png?url';
import fontMetricsUrl from '../../../assets/fonts/default/default.json?url';
import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import {
  Axis2dAction,
  buttonMoments,
  KeyboardAxis2dBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  keyCodes,
  MouseInputSource,
  registerInputs,
  TriggerAction,
} from '../../../src/input/index.js';
import {
  addCameraComponent,
  addVisibilityComponent,
  Color,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
} from '../../../src/rendering/index.js';
import {
  createTextShapingEcsSystem,
  FontAtlasCache,
} from '../../../src/text/index.js';
import {
  addUiInteractableComponent,
  CanvasEcsComponent,
  canvasId,
  createPanel,
  createTextInput,
  createUiCanvas,
  registerUiSystems,
  setUiFocus,
  UiAnchor,
  uiScaleModes,
} from '../../../src/ui/index.js';
import { PixelBounds, scanPixelBounds } from './input-scene-helpers.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

const worldRenderCategory = 1 << 0;
const uiRenderCategory = 1 << 1;

/** Where the field and the button sit, in CSS pixels from the canvas's top-left. */
const fieldCenter = { x: 400, y: 300 };
const buttonCenter = { x: 400, y: 150 };

/** The handle `ui-text-input.spec.ts` drives and asserts against. */
export interface UiTextInputSceneHandle extends SceneHandle {
  /** The field's committed value. */
  readonly value: string;

  /** Whether the field is being typed into. */
  readonly isEditing: boolean;

  /** How many times `onSubmit` was raised, and with what values. */
  readonly submittedValues: string[];

  /** How many times `onCancel` was raised. */
  readonly cancelCount: number;

  /** Whether the button above the field has UI focus. */
  readonly isButtonFocused: boolean;

  /** The field's center, in page CSS pixels. */
  readonly fieldCenter: { x: number; y: number };

  /** The button's center, in page CSS pixels. */
  readonly buttonCenter: { x: number; y: number };

  /** Gives the button above the field UI focus. */
  focusButton(): void;

  /** Shows or hides a panel that covers the field and blocks the pointer. */
  setCoverVisible(visible: boolean): void;

  /**
   * The on-screen bounds of the field's dark text ink, from the rendered
   * canvas, or `null` when no text is drawn. The caret is red, so it isn't
   * counted. Must be called in the same `page.evaluate` task as the
   * preceding `step()`.
   */
  measureTextInk(): PixelBounds | null;
}

/**
 * Builds a screen-space UI canvas (1 reference pixel per CSS pixel) with a
 * text field in the middle, a focusable button above it, and a hidden
 * cover panel over the field. The canvas navigates with the arrow keys and
 * submits with Enter, so the spec can check that keys typed into the
 * field don't reach either.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<UiTextInputSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);

  canvas.width = 800;
  canvas.height = 600;

  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const submitInput = new TriggerAction('ui-submit');
  const navigateInput = new Axis2dAction('ui-navigate');
  const inputManager = registerInputs(world, time, {
    triggerActions: [submitInput],
    axis2dActions: [navigateInput],
  });
  const mouseInputSource = new MouseInputSource(inputManager, container);
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

  const worldCameraEntity = world.createEntity();

  addPositionComponent(world, worldCameraEntity);
  addCameraComponent(world, worldCameraEntity, {
    isStatic: true,
    clearColor: new Color(0.8, 0.8, 0.8, 1),
    cullingMask: worldRenderCategory,
  });

  registerUiSystems(world, renderContext, time, {
    pointerSource: mouseInputSource,
  });

  const uiCanvas = createUiCanvas(world, renderContext, {
    cullingMask: uiRenderCategory,
    scaleMode: uiScaleModes.constantPixelSize,
    submitInput,
    navigateInput,
  });

  const fontAtlas = await new FontAtlasCache(renderContext).getOrLoad({
    metricsUrl: fontMetricsUrl,
    imageUrl: fontImageUrl,
  });

  const sprite = (tint: Color) => ({
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: uiRenderCategory,
    tintColor: tint,
  });

  const button = createPanel(world, uiCanvas, {
    sprite: sprite(new Color(0.3, 0.5, 0.9, 1)),
    anchor: UiAnchor.center({ x: 200, y: 60 }),
    anchoredPosition: { x: 0, y: 300 - buttonCenter.y },
  });
  const buttonInteractable = addUiInteractableComponent(world, button);

  const field = createTextInput(world, uiCanvas, {
    renderContext,
    sprite: sprite(Color.white),
    fillSprite: sprite(Color.white),
    fontAtlas,
    size: 32,
    anchor: UiAnchor.center({ x: 400, y: 60 }),
    textColor: Color.black,
    caretColor: Color.red,
    category: uiRenderCategory,
    maxLength: 16,
    attributes: { ariaLabel: 'Name' },
  });

  const cover = createPanel(world, uiCanvas, {
    sprite: sprite(new Color(0.1, 0.6, 0.2, 1)),
    anchor: UiAnchor.center({ x: 440, y: 100 }),
  });
  addUiInteractableComponent(world, cover);

  const coverVisibility = addVisibilityComponent(world, cover, {
    visible: false,
  });

  const submittedValues: string[] = [];
  let cancelCount = 0;

  field.onSubmit.registerListener((value) => submittedValues.push(value));
  field.onCancel.registerListener(() => cancelCount++);

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  const toPage = (point: { x: number; y: number }) => {
    const bounds = canvas.getBoundingClientRect();

    return { x: bounds.left + point.x, y: bounds.top + point.y };
  };

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    get value(): string {
      return field.textInput.value;
    },

    get isEditing(): boolean {
      return field.textInput.isEditing;
    },

    get submittedValues(): string[] {
      return [...submittedValues];
    },

    get cancelCount(): number {
      return cancelCount;
    },

    get isButtonFocused(): boolean {
      return buttonInteractable.isFocused;
    },

    get fieldCenter(): { x: number; y: number } {
      return toPage(fieldCenter);
    },

    get buttonCenter(): { x: number; y: number } {
      return toPage(buttonCenter);
    },

    focusButton(): void {
      setUiFocus(
        world,
        world.getComponentRequired<CanvasEcsComponent>(uiCanvas, canvasId),
        button,
      );
    },

    setCoverVisible(visible: boolean): void {
      coverVisibility.visible = visible;
    },

    measureTextInk(): PixelBounds | null {
      return scanPixelBounds(canvas, (r, g, b) => r < 90 && g < 90 && b < 90);
    },
  };
};
