import { addPositionComponent, Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Axis2dAction, TriggerAction } from '../../input/index.js';
import { Vector2 } from '../../math/index.js';
import {
  Color,
  createCamera,
  createRenderTarget,
  RenderContext,
} from '../../rendering/index.js';
import {
  addCanvasComponent,
  CanvasEcsComponent,
} from '../components/canvas-component.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import { createUiLayoutEcsSystem } from '../systems/ui-layout-system.js';
import { createUiInteractionEcsSystem } from '../systems/ui-interaction-system.js';
import { createUiNavigationEcsSystem } from '../systems/ui-navigation-system.js';
import { createUiProgressBarEcsSystem } from '../systems/ui-progress-bar-system.js';
import { createUiRaycastEcsSystem } from '../systems/ui-raycast-system.js';
import { createUiSliderEcsSystem } from '../systems/ui-slider-system.js';
import { createUiToggleEcsSystem } from '../systems/ui-toggle-system.js';
import { createUiTransitionEcsSystem } from '../systems/ui-transition-system.js';
import { UiPointerSource } from '../types/ui-pointer-source.js';
import { UiScaleMode } from '../types/ui-scale-mode.js';

/**
 * Worlds that already have `createUiLayoutEcsSystem` (and
 * `createUiProgressBarEcsSystem`, which must run before it) registered, so
 * calling `createUiCanvas` more than once for the same `EcsWorld` (multiple
 * canvases sharing one game) doesn't register either a second time
 * redundantly resolving every canvas again.
 */
const worldsWithUiLayoutSystem = new WeakSet<EcsWorld>();

/**
 * The interaction pipeline systems already registered for a given world,
 * keyed so a second (or later) `createUiCanvas` call - for another canvas,
 * or one that supplies `pointerSource` after an earlier call didn't -
 * extends the same pipeline instead of registering duplicates. See
 * `ensureUiInteractionPipeline`.
 */
interface UiInteractionPipeline {
  navigation: EcsSystem<[CanvasEcsComponent]>;
  transition: EcsSystem<readonly unknown[]>;
  toggle: EcsSystem<readonly unknown[]>;
  raycast?: EcsSystem<[CanvasEcsComponent]>;
  interaction?: EcsSystem<readonly unknown[]>;
  slider?: EcsSystem<readonly unknown[]>;
}

const uiInteractionPipelinesByWorld = new WeakMap<
  EcsWorld,
  UiInteractionPipeline
>();

/**
 * Registers `createUiNavigationEcsSystem`, `createUiTransitionEcsSystem`,
 * and `createUiToggleEcsSystem` unconditionally, and - once a pointer source
 * is available - `createUiRaycastEcsSystem`/`createUiInteractionEcsSystem`/
 * `createUiSliderEcsSystem`, at most once each per `world`. Registration
 * order is raycast, then navigation, then interaction, then toggle and
 * transition (order between those two doesn't matter, neither reads the
 * other's writes), then slider: raycast must run before navigation and
 * interaction read its hit-test result, interaction must run before
 * transition reads the interaction state it just wrote, navigation must run
 * before interaction because navigation is what resets
 * `wasInvokedThisFrame` to `false` each tick before interaction
 * conditionally sets it back to `true` for the pointer path, toggle must run
 * after both navigation and interaction for the same reason, and slider must
 * run after interaction (it reads `pressCapture`). Extends an
 * already-registered pipeline rather than duplicating it, so a canvas
 * created without a pointer source and a later one that supplies it still
 * end up with a single, correctly-ordered pipeline for the whole world.
 */
function ensureUiInteractionPipeline(
  world: EcsWorld,
  renderContext: RenderContext,
  time: Time,
  pointerSource: UiPointerSource | undefined,
): void {
  let pipeline = uiInteractionPipelinesByWorld.get(world);

  if (!pipeline) {
    const navigation = createUiNavigationEcsSystem();

    world.addSystem(navigation);

    const transition = createUiTransitionEcsSystem(time);

    world.addSystem(transition, { after: [navigation] });

    const toggle = createUiToggleEcsSystem();

    world.addSystem(toggle, { after: [navigation] });

    pipeline = { navigation, transition, toggle };
    uiInteractionPipelinesByWorld.set(world, pipeline);
  }

  if (pointerSource && !pipeline.raycast) {
    const raycast = createUiRaycastEcsSystem(pointerSource, renderContext);

    world.addSystem(raycast, { before: [pipeline.navigation] });
    pipeline.raycast = raycast;

    const interaction = createUiInteractionEcsSystem(
      pointerSource,
      renderContext,
    );

    world.addSystem(interaction, {
      after: [pipeline.navigation, raycast],
      before: [pipeline.transition, pipeline.toggle],
    });
    pipeline.interaction = interaction;

    const slider = createUiSliderEcsSystem(pointerSource, renderContext);

    world.addSystem(slider, { after: [interaction] });
    pipeline.slider = slider;
  }
}

/**
 * Fields of {@link CreateUiCanvasOptions} with no sensible default; callers
 * must always provide these.
 */
export interface CreateUiCanvasRequiredOptions {
  /**
   * The UI camera's culling mask, matched against `Renderable.category` (see
   * `createImageSprite`'s `layer` option) and `TextEcsComponent.category` to
   * decide what this camera draws. Forge doesn't reserve or suggest any
   * particular bit for UI - pick any value your game isn't already using for
   * another camera, and reuse that same value for every UI visual's own
   * category (`createLabel`'s `category` option, the `layer` you build UI
   * sprites with) so this canvas draws them and no other camera's
   * `cullingMask` also matches them. A hardcoded "UI" bit baked into this
   * module would only work by coincidence once more than one Forge-based
   * package picks its own default independently - explicit, caller-owned
   * values avoid that collision entirely. Note `matchesMask` does
   * `identifier & mask` on plain JS `number`s, which `&` coerces to 32-bit
   * *signed* integers - bit 31 is the sign bit, so `1 << 31` is
   * `-2147483648`, not a clean single-bit flag; stick to bits 0-30.
   */
  cullingMask: number;
}

/**
 * Fields of {@link CreateUiCanvasOptions} with a sensible default, or that
 * are genuinely optional (no default at all); callers may omit these.
 */
export interface CreateUiCanvasDefaultedOptions {
  /**
   * The resolution UI is authored against, in reference pixels. Defaults to
   * `1920x1080`.
   */
  referenceResolution: Vector2;

  /** How the canvas's root rect responds to the destination's live size. */
  scaleMode: UiScaleMode;

  /**
   * The UI camera's `layer`, i.e. its position in the present pass's
   * compositing order (see `CameraEcsComponent.layer`). Defaults to `1000`,
   * comfortably above any world camera's default `layer` of `0`, so the UI
   * composites on top without every game having to hand-tune camera layers
   * just to put a HUD on screen.
   */
  layer: number;

  /**
   * The pointer source this canvas's interactables (see
   * `UiInteractableEcsComponent`) are hit-tested and pressed/hovered/dragged
   * against - `MouseInputSource` satisfies this without any changes, and any
   * other device (e.g. a touchscreen) can too by exposing the same shape.
   * Omit for a canvas with no pointer interaction at all (still fully
   * focus-navigable if `submitInput`/`navigateInput` are given). Supply it
   * on your first/only `createUiCanvas` call for a world to get a
   * fully-ordered pipeline - see `ensureUiInteractionPipeline`.
   */
  pointerSource?: UiPointerSource;

  /**
   * The action that raises `onInvoke` on the currently focused interactable.
   * Omitted, this canvas's focused element is only invocable by pointer.
   */
  submitInput?: TriggerAction;

  /** The action that clears this canvas's currently focused element. */
  cancelInput?: TriggerAction;

  /** The action that moves this canvas's focus between interactable elements. */
  navigateInput?: Axis2dAction;
}

export type CreateUiCanvasOptions = CreateUiCanvasRequiredOptions &
  Partial<CreateUiCanvasDefaultedOptions>;

const defaultCreateUiCanvasOptions = {
  layer: 1000,
};

/**
 * Creates a fully wired UI canvas: a root entity with a `CanvasEcsComponent`
 * and `RectTransformEcsComponent`, and a dedicated, static UI camera with a
 * transparent clear color, its own off-screen `RenderTarget`, and a culling
 * mask isolating it from the world so a world camera whose own `cullingMask`
 * still matches everything doesn't draw UI content a second time. Also
 * registers `createUiLayoutEcsSystem`, `createUiProgressBarEcsSystem`,
 * `createUiNavigationEcsSystem`, `createUiTransitionEcsSystem`, and
 * `createUiToggleEcsSystem` with `world` (each at most once, regardless of
 * how many canvases are created) - plus `createUiRaycastEcsSystem`/
 * `createUiInteractionEcsSystem`/`createUiSliderEcsSystem` once a pointer
 * source is supplied, on this call or a later one for the same world - see
 * `ensureUiInteractionPipeline` for the registration order and why it
 * matters.
 *
 * The caller is still responsible for registering `createTransformEcsSystem`
 * and `createRenderEcsSystem` with `world` - **after** calling
 * `createUiCanvas`, so the layout system (which writes `position.local`)
 * runs before the transform system (which reads it to compute
 * `position.world`), which in turn must run before the render system. Both
 * are ordinary, already-existing systems a game registers once regardless
 * of UI, so `createUiCanvas` doesn't register a second instance of either.
 * @param world - The ECS world to create the canvas entity in.
 * @param renderContext - The render context the UI camera's render target
 * (and the layout system's canvas-root sizing) is built against.
 * @param time - The time instance driving `createUiTransitionEcsSystem`'s
 * tint tweens.
 * @param options - Options for configuring the canvas and its interaction
 * inputs. `cullingMask` has no sensible default and must always be provided
 * - see {@link CreateUiCanvasRequiredOptions.cullingMask}.
 * @returns The created canvas entity. Attach children to it with
 * `addParentComponent(world, child, { parent: canvas })`, or use
 * `createPanel`/`createLabel`/`createButton`.
 */
export function createUiCanvas(
  world: EcsWorld,
  renderContext: RenderContext,
  time: Time,
  options: CreateUiCanvasOptions,
): number {
  const {
    referenceResolution,
    scaleMode,
    cullingMask,
    layer,
    pointerSource,
    submitInput,
    cancelInput,
    navigateInput,
  } = {
    ...defaultCreateUiCanvasOptions,
    ...options,
  };

  const renderTarget = createRenderTarget(
    renderContext.gl,
    renderContext.width,
    renderContext.height,
  );

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask,
    layer,
    clearColor: Color.transparent,
    renderTarget,
    verticalWorldUnits: referenceResolution?.y ?? 1080,
  });

  const canvas = world.createEntity();

  addPositionComponent(world, canvas);
  addRectTransformComponent(world, canvas);
  addCanvasComponent(world, canvas, {
    camera,
    ...(referenceResolution && { referenceResolution }),
    ...(scaleMode && { scaleMode }),
    ...(submitInput && { submitInput }),
    ...(cancelInput && { cancelInput }),
    ...(navigateInput && { navigateInput }),
  });

  if (!worldsWithUiLayoutSystem.has(world)) {
    // Progress bars have no interaction dependency at all, so - unlike
    // toggle/slider, which need this tick's interaction-pipeline state and
    // so can only run after it - registering this before layout lets a
    // `value` write and the fill visual it produces land in the very same
    // frame.
    const progressBar = createUiProgressBarEcsSystem();

    world.addSystem(progressBar);
    world.addSystem(createUiLayoutEcsSystem(renderContext), {
      after: [progressBar],
    });
    worldsWithUiLayoutSystem.add(world);
  }

  ensureUiInteractionPipeline(world, renderContext, time, pointerSource);

  return canvas;
}
