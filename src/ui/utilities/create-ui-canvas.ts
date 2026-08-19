import { addPositionComponent, Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  Axis2dAction,
  MouseInputSource,
  TriggerAction,
} from '../../input/index.js';
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
import { createUiRaycastEcsSystem } from '../systems/ui-raycast-system.js';
import { createUiTransitionEcsSystem } from '../systems/ui-transition-system.js';
import { UiScaleMode } from '../types/ui-scale-mode.js';

/**
 * The render category a UI sprite/text renderable should draw with (see
 * `createImageSprite`'s `layer` option, `Renderable`'s `category` parameter,
 * and `TextEcsComponent.category`) to be visible on a UI canvas using the
 * default `cullingMask`. Not a reserved value - just a sensible default,
 * which `createPanel`'s sprites (once built with a matching category) and
 * `createLabel`'s text (automatically, see its own default) both use. Kept
 * as a dedicated high bit so it's unlikely to collide with a game's own,
 * usually low-numbered, world render categories - without it, a world
 * camera whose own `cullingMask` still matches everything would draw UI
 * content a second time, wherever its UI-space position happens to land in
 * the world.
 */
export const defaultUiRenderCategory = 1 << 30;

/**
 * Worlds that already have `createUiLayoutEcsSystem` registered, so calling
 * `createUiCanvas` more than once for the same `EcsWorld` (multiple canvases
 * sharing one game) doesn't register a second layout system redundantly
 * resolving every canvas a second time.
 */
const worldsWithUiLayoutSystem = new WeakSet<EcsWorld>();

/**
 * The interaction pipeline systems already registered for a given world,
 * keyed so a second (or later) `createUiCanvas` call - for another canvas,
 * or one that supplies `mouseInputSource` after an earlier call didn't -
 * extends the same pipeline instead of registering duplicates. See
 * `ensureUiInteractionPipeline`.
 */
interface UiInteractionPipeline {
  navigation: EcsSystem<[CanvasEcsComponent]>;
  transition: EcsSystem<readonly unknown[]>;
  raycast?: EcsSystem<[CanvasEcsComponent]>;
  interaction?: EcsSystem<readonly unknown[]>;
}

const uiInteractionPipelinesByWorld = new WeakMap<
  EcsWorld,
  UiInteractionPipeline
>();

/**
 * Registers `createUiNavigationEcsSystem`, `createUiTransitionEcsSystem`,
 * and - once a `MouseInputSource` is available - `createUiRaycastEcsSystem`/
 * `createUiInteractionEcsSystem`, at most once each per `world`, ordered per
 * `design/ui-system.md`'s §5.4 frame pipeline (raycast, then navigation,
 * then interaction, then transition). Extends an already-registered
 * pipeline rather than duplicating it, so a canvas created without
 * `mouseInputSource` and a later one that supplies it still end up with a
 * single, correctly-ordered pipeline for the whole world.
 */
function ensureUiInteractionPipeline(
  world: EcsWorld,
  renderContext: RenderContext,
  time: Time,
  mouseInputSource: MouseInputSource | undefined,
): void {
  let pipeline = uiInteractionPipelinesByWorld.get(world);

  if (!pipeline) {
    const navigation = createUiNavigationEcsSystem();

    world.addSystem(navigation);

    const transition = createUiTransitionEcsSystem(time);

    world.addSystem(transition, { after: [navigation] });

    pipeline = { navigation, transition };
    uiInteractionPipelinesByWorld.set(world, pipeline);
  }

  if (mouseInputSource && !pipeline.raycast) {
    const raycast = createUiRaycastEcsSystem(mouseInputSource, renderContext);

    world.addSystem(raycast, { before: [pipeline.navigation] });
    pipeline.raycast = raycast;

    const interaction = createUiInteractionEcsSystem(
      mouseInputSource,
      renderContext,
    );

    world.addSystem(interaction, {
      after: [pipeline.navigation, raycast],
      before: [pipeline.transition],
    });
    pipeline.interaction = interaction;
  }
}

export interface CreateUiCanvasOptions {
  /**
   * The resolution UI is authored against, in reference pixels. Defaults to
   * `1920x1080`.
   */
  referenceResolution?: Vector2;

  /** How the canvas's root rect responds to the destination's live size. */
  scaleMode?: UiScaleMode;

  /**
   * The UI camera's culling mask. Defaults to {@link defaultUiRenderCategory}
   * alone - build UI sprites with a matching `Renderable.category` (see
   * `createImageSprite`'s `layer` option) so the world camera doesn't also
   * draw them; `createLabel`'s text matches it automatically.
   */
  cullingMask?: number;

  /**
   * The UI camera's `layer`, i.e. its position in the present pass's
   * compositing order (see `CameraEcsComponent.layer`). Defaults to `1000`,
   * comfortably above any world camera's default `layer` of `0`, so the UI
   * composites on top without every game having to hand-tune camera layers
   * just to put a HUD on screen.
   */
  layer?: number;

  /**
   * The pointer source this canvas's interactables (see
   * `UiInteractableEcsComponent`) are hit-tested and pressed/hovered/dragged
   * against. Omit for a canvas with no pointer interaction at all (still
   * fully focus-navigable if `submitInput`/`navigateInput` are given).
   * Supply it on your first/only `createUiCanvas` call for a world to get a
   * fully-ordered pipeline - see `ensureUiInteractionPipeline`.
   */
  mouseInputSource?: MouseInputSource;

  /**
   * The action that raises `onActivate` on the currently focused
   * interactable. Omitted, this canvas's focused element is only
   * activatable by pointer.
   */
  submitInput?: TriggerAction;

  /** The action that clears this canvas's currently focused element. */
  cancelInput?: TriggerAction;

  /** The action that moves this canvas's focus between interactable elements. */
  navigateInput?: Axis2dAction;
}

const defaultCreateUiCanvasOptions = {
  cullingMask: defaultUiRenderCategory,
  layer: 1000,
};

/**
 * Creates a fully wired UI canvas: a root entity with a `CanvasEcsComponent`
 * and `RectTransformEcsComponent`, and a dedicated, static UI camera with a
 * transparent clear color, its own off-screen `RenderTarget`, and a culling
 * mask isolating it from the world (see `design/ui-system.md`'s DL-01). Also
 * registers `createUiLayoutEcsSystem`, `createUiNavigationEcsSystem`, and
 * `createUiTransitionEcsSystem` with `world` (each at most once, regardless
 * of how many canvases are created) - plus `createUiRaycastEcsSystem`/
 * `createUiInteractionEcsSystem` once `mouseInputSource` is supplied, on
 * this call or a later one for the same world - in the order
 * `design/ui-system.md`'s §5.4 frame pipeline calls for.
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
 * inputs.
 * @returns The created canvas entity. Attach children to it with
 * `addParentComponent(world, child, { parent: canvas })`, or use
 * `createPanel`/`createLabel`/`createButton`.
 */
export function createUiCanvas(
  world: EcsWorld,
  renderContext: RenderContext,
  time: Time,
  options: CreateUiCanvasOptions = {},
): number {
  const {
    referenceResolution,
    scaleMode,
    cullingMask,
    layer,
    mouseInputSource,
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
    world.addSystem(createUiLayoutEcsSystem(renderContext));
    worldsWithUiLayoutSystem.add(world);
  }

  ensureUiInteractionPipeline(world, renderContext, time, mouseInputSource);

  return canvas;
}
