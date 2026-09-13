import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';
import {
  Color,
  createCamera,
  createRenderTarget,
  RenderContext,
} from '../../rendering/index.js';
import {
  addCanvasComponent,
  CanvasInputOptions,
} from '../components/canvas-component.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import { UiAnchor, UiAnchorConfig } from '../types/ui-anchor.js';
import { uiCanvasRenderModes } from '../types/ui-canvas-render-mode.js';
import { UiScaleMode } from '../types/ui-scale-mode.js';

/**
 * `createUiCanvas` options for `renderMode: 'screenSpace'` (the default) -
 * a dedicated, static UI camera drawing through its own off-screen
 * `RenderTarget`, resolved every frame from the render destination's live
 * size.
 */
export interface ScreenSpaceUiCanvasOptions extends CanvasInputOptions {
  renderMode?: typeof uiCanvasRenderModes.screenSpace;

  /**
   * The dedicated UI camera's culling mask, matched against
   * `Renderable.category` (see `createImageSprite`'s `layer` option) and
   * `TextEcsComponent.category` to decide what this camera draws. Forge
   * doesn't reserve or suggest any particular bit for UI - pick any value
   * your game isn't already using for another camera, and reuse that same
   * value for every UI visual's own category (`createLabel`'s `category`
   * option, the `layer` you build UI sprites with) so this canvas draws
   * them and no other camera's `cullingMask` also matches them. A
   * hardcoded "UI" bit baked into this module would only work by
   * coincidence once more than one Forge-based package picks its own
   * default independently - explicit, caller-owned values avoid that
   * collision entirely. Note `matchesMask` does `identifier & mask` on
   * plain JS `number`s, which `&` coerces to 32-bit *signed* integers - bit
   * 31 is the sign bit, so `1 << 31` is `-2147483648`, not a clean
   * single-bit flag; stick to bits 0-30.
   */
  cullingMask: number;

  /**
   * The resolution UI is authored against, in reference pixels. Defaults to
   * `1920x1080`.
   */
  referenceResolution?: Vector2;

  /** How the canvas's root rect responds to the destination's live size. */
  scaleMode?: UiScaleMode;

  /**
   * The dedicated UI camera's `layer`, i.e. its position in the present
   * pass's compositing order (see `CameraEcsComponent.layer`). Defaults to
   * `1000`, comfortably above any world camera's default `layer` of `0`, so
   * the UI composites on top without every game having to hand-tune camera
   * layers just to put a HUD on screen.
   */
  layer?: number;
}

/**
 * `createUiCanvas` options for `renderMode: 'worldSpace'` - a canvas whose
 * root rect is an ordinary, anchored `RectTransformEcsComponent` positioned
 * via the entity hierarchy, drawn through the caller's own `camera`.
 */
export interface WorldSpaceUiCanvasOptions extends CanvasInputOptions {
  renderMode: typeof uiCanvasRenderModes.worldSpace;

  /**
   * The camera this canvas draws through - typically the game's own world
   * camera, so this canvas pans, zooms, and moves with everything else it
   * draws through.
   */
  camera: number;

  /**
   * The anchor this canvas's own root rect resolves with. Defaults to
   * `UiAnchor.center()` (a literal `100x100` reference-pixel box) - size it
   * to fit the content you'll add as its children (a health bar background,
   * say), and attach `addUiWorldSpaceFollowComponent(world, canvas, {
   * target: enemy })` so it tracks the entity it should follow. That's a
   * different relationship from `addParentComponent`: a diegetic UI canvas
   * almost always wants to follow its target's world *position* only, never
   * its rotation (so it stays upright above the target regardless of which
   * way it's facing, instead of swinging around with it) - see
   * `UiWorldSpaceFollowEcsComponent`'s own doc comment for why that isn't
   * expressed as a `ParentEcsComponent` option. Register
   * `createUiWorldSpaceFollowEcsSystem()` once, after
   * `createTransformEcsSystem()`, for any world using this.
   */
  anchor?: UiAnchorConfig;

  /** Offset of this canvas's own root rect from its anchor. See `anchor` above. */
  anchoredPosition?: Vector2;
}

export type CreateUiCanvasOptions =
  ScreenSpaceUiCanvasOptions | WorldSpaceUiCanvasOptions;

/**
 * Creates a UI canvas: a root entity with a `CanvasEcsComponent` and
 * `RectTransformEcsComponent`. For `renderMode: 'screenSpace'` (the
 * default), also a dedicated, static UI camera with a transparent clear
 * color, its own off-screen `RenderTarget`, and a culling mask isolating it
 * from the world so a world camera whose own `cullingMask` still matches
 * everything doesn't draw UI content a second time. For
 * `renderMode: 'worldSpace'`, no camera is created - `options.camera` names
 * the (typically world) camera this canvas draws through instead.
 *
 * Call `registerUiSystems(world, renderContext, time)` once per `world`
 * before (or after - registration order between the two doesn't matter,
 * only tick order does) creating any canvases; this function only creates
 * the canvas entity itself; it never touches system registration, so it's
 * always safe to call once per canvas, however many canvases a world has.
 * @param world - The ECS world to create the canvas entity in.
 * @param renderContext - The render context a `'screenSpace'` canvas's UI
 * camera/render target is built against. Unused for `'worldSpace'`.
 * @param options - Options for configuring the canvas and its focus
 * navigation inputs. Which fields are available - `cullingMask`/
 * `referenceResolution`/`scaleMode`/`layer` vs. `camera`/`anchor`/
 * `anchoredPosition` - depends on `renderMode`, enforced at compile time
 * (see {@link ScreenSpaceUiCanvasOptions}/{@link WorldSpaceUiCanvasOptions}).
 * @returns The created canvas entity. Attach children to it with
 * `addParentComponent(world, child, { parent: canvas })`, or use
 * `createPanel`/`createLabel`/`createButton`.
 */
export function createUiCanvas(
  world: EcsWorld,
  renderContext: RenderContext,
  options: CreateUiCanvasOptions,
): number {
  const { submitInput, cancelInput, navigateInput } = options;

  const canvas = world.createEntity();

  addPositionComponent(world, canvas);

  if (options.renderMode === uiCanvasRenderModes.worldSpace) {
    const { camera, anchor = UiAnchor.center(), anchoredPosition } = options;

    addRectTransformComponent(world, canvas, {
      ...anchor,
      ...(anchoredPosition && { anchoredPosition }),
    });
    addCanvasComponent(world, canvas, {
      camera,
      renderMode: uiCanvasRenderModes.worldSpace,
      ...(submitInput && { submitInput }),
      ...(cancelInput && { cancelInput }),
      ...(navigateInput && { navigateInput }),
    });
  } else {
    const {
      cullingMask,
      referenceResolution,
      scaleMode,
      layer = 1000,
    } = options;

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

    // A `renderMode: 'screenSpace'` root's rect is fully recomputed from
    // the render destination's size on the very first layout pass (see
    // `createUiLayoutEcsSystem`) - its initial value here is never read.
    addRectTransformComponent(world, canvas);
    addCanvasComponent(world, canvas, {
      camera,
      renderMode: uiCanvasRenderModes.screenSpace,
      ...(referenceResolution && { referenceResolution }),
      ...(scaleMode && { scaleMode }),
      ...(submitInput && { submitInput }),
      ...(cancelInput && { cancelInput }),
      ...(navigateInput && { navigateInput }),
    });
  }

  return canvas;
}
