import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import {
  Color,
  createCamera,
  createRenderTarget,
  RenderContext,
} from '../../rendering/index.js';
import { addCanvasComponent } from '../components/canvas-component.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import { createUiLayoutEcsSystem } from '../systems/ui-layout-system.js';
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
}

const defaultCreateUiCanvasOptions = {
  cullingMask: defaultUiRenderCategory,
  layer: 1000,
};

/**
 * Creates a fully wired UI canvas: a root entity with a `CanvasEcsComponent`
 * and `RectTransformEcsComponent`, and a dedicated, static UI camera with a
 * transparent clear color, its own off-screen `RenderTarget`, and a culling
 * mask isolating it from the world (see `design/ui-system.md`'s DL-01).
 * Also registers `createUiLayoutEcsSystem` with `world` (once, regardless of
 * how many canvases are created).
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
 * @param options - Options for configuring the canvas.
 * @returns The created canvas entity. Attach children to it with
 * `addParentComponent(world, child, { parent: canvas })`, or use
 * `createPanel`/`createLabel`.
 */
export function createUiCanvas(
  world: EcsWorld,
  renderContext: RenderContext,
  options: CreateUiCanvasOptions = {},
): number {
  const { referenceResolution, scaleMode, cullingMask, layer } = {
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
  });

  if (!worldsWithUiLayoutSystem.has(world)) {
    world.addSystem(createUiLayoutEcsSystem(renderContext));
    worldsWithUiLayoutSystem.add(world);
  }

  return canvas;
}
