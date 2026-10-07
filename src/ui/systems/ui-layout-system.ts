import { PositionEcsComponent, positionId } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Rect, Rects, Vector2 } from '../../math/index.js';
import {
  CameraEcsComponent,
  cameraId,
  CameraView,
  computeCameraView,
  MaskEcsComponent,
  maskId,
  RenderContext,
  SpriteEcsComponent,
  spriteId,
} from '../../rendering/index.js';
import { TextEcsComponent, textId } from '../../text/index.js';
import {
  CanvasEcsComponent,
  canvasId,
} from '../components/canvas-component.js';
import {
  RectTransformEcsComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import { uiCanvasRenderModes } from '../types/ui-canvas-render-mode.js';
import { uiScaleModes } from '../types/ui-scale-mode.js';
import { resolveRect } from '../utilities/resolve-rect.js';

/**
 * Resolves a canvas's root rect (and the world height its dedicated camera
 * should show) from the render destination's live size, per `scaleMode`.
 * Centered at the origin; the rect is only used as is when the canvas's
 * camera can't provide a view (see `resolveEntityRect`).
 */
function resolveCanvasRootRect(
  renderContext: RenderContext,
  canvas: Extract<
    CanvasEcsComponent,
    { renderMode: typeof uiCanvasRenderModes.screenSpace }
  >,
): { rect: Rect; worldHeight: number } {
  const aspectRatio = renderContext.width / renderContext.height;

  let worldHeight: number;

  if (canvas.scaleMode === uiScaleModes.constantPixelSize) {
    worldHeight = renderContext.cssHeight;
  } else if (canvas.scaleMode === uiScaleModes.matchWidth) {
    worldHeight = canvas.referenceResolution.x / aspectRatio;
  } else if (canvas.scaleMode === uiScaleModes.fitReferenceResolution) {
    // The larger of `scaleWithScreenSize`'s and `matchWidth`'s own
    // candidate world heights - see `fitReferenceResolution`'s own doc
    // comment for why that's exactly the rect that's always at least
    // `referenceResolution` on both axes.
    worldHeight = Math.max(
      canvas.referenceResolution.y,
      canvas.referenceResolution.x / aspectRatio,
    );
  } else {
    worldHeight = canvas.referenceResolution.y;
  }

  const worldWidth = worldHeight * aspectRatio;

  return {
    rect: {
      min: { x: -worldWidth / 2, y: -worldHeight / 2 },
      max: { x: worldWidth / 2, y: worldHeight / 2 },
    },
    worldHeight,
  };
}

function pivotPositionOf(rect: Rect, pivot: Vector2): Vector2 {
  return {
    x: rect.min.x + (rect.max.x - rect.min.x) * pivot.x,
    y: rect.min.y + (rect.max.y - rect.min.y) * pivot.y,
  };
}

/**
 * Resolves one entity's rect - a screen-space canvas root (its camera's
 * view, after syncing the camera's `verticalWorldUnits` from
 * `resolveCanvasRootRect`), or, for anything else
 * (an ordinary element, or a world-space canvas root), against `parentRect`
 * via `resolveRect` - and the reference-pixel-to-screen-pixel ratio this
 * entity's own *children* should resolve a `'screenPixels'`-unit `UiAxis`
 * against (see `UiAxisSizeUnit`): recomputed from whichever camera this
 * entity's own canvas has, for either kind of canvas root, or inherited
 * unchanged from `pixelsPerUnit` for a non-canvas element or a canvas root
 * with no resolvable camera.
 */
function resolveEntityRect(
  world: EcsWorld,
  renderContext: RenderContext,
  canvasComponent: CanvasEcsComponent | null,
  rectTransform: RectTransformEcsComponent,
  parentRect: Rect,
  pixelsPerUnit: number,
): { rect: Rect; childPixelsPerUnit: number } {
  if (
    canvasComponent &&
    canvasComponent.renderMode === uiCanvasRenderModes.screenSpace
  ) {
    const resolved = resolveCanvasRootRect(renderContext, canvasComponent);
    const camera = world.getComponent<CameraEcsComponent>(
      canvasComponent.camera,
      cameraId,
    );

    if (!camera) {
      return { rect: resolved.rect, childPixelsPerUnit: pixelsPerUnit };
    }

    camera.verticalWorldUnits = resolved.worldHeight;

    const view = computeCanvasCameraView(
      world,
      renderContext,
      canvasComponent,
      camera,
    );

    if (!view) {
      return { rect: resolved.rect, childPixelsPerUnit: pixelsPerUnit };
    }

    // The canvas fills what its camera shows, wherever the camera is and
    // however it's zoomed.
    return { rect: view.bounds, childPixelsPerUnit: view.pixelsPerUnit };
  }

  const rect = resolveRect(parentRect, rectTransform, pixelsPerUnit);
  const camera = canvasComponent
    ? world.getComponent<CameraEcsComponent>(canvasComponent.camera, cameraId)
    : null;
  const view =
    canvasComponent && camera
      ? computeCanvasCameraView(world, renderContext, canvasComponent, camera)
      : null;

  return {
    rect,
    childPixelsPerUnit: view ? view.pixelsPerUnit : pixelsPerUnit,
  };
}

/**
 * The view of a canvas's camera, or `null` if the camera entity has no
 * position to center a view on.
 */
function computeCanvasCameraView(
  world: EcsWorld,
  renderContext: RenderContext,
  canvasComponent: CanvasEcsComponent,
  camera: CameraEcsComponent,
): CameraView | null {
  const cameraPosition = world.getComponent<PositionEcsComponent>(
    canvasComponent.camera,
    positionId,
  );

  return cameraPosition
    ? computeCameraView(camera, cameraPosition, renderContext)
    : null;
}

/**
 * Creates a system that resolves every `RectTransformEcsComponent` against
 * its parent's rect, top-down, in hierarchy pre-order starting from each
 * `CanvasEcsComponent`'s root. For each element it writes the resolved
 * `RectTransformEcsComponent.rect`, the entity's `PositionEcsComponent.local`
 * (so the existing `createTransformEcsSystem` composes the correct
 * `position.world`), and, for an element with a `SpriteEcsComponent` or a
 * `MaskEcsComponent`, its `width`/`height`/`pivot`, so a mask clips to the
 * element's rect. It doesn't order anything: the render
 * system draws a UI tree in hierarchy order like any other, and the UI's
 * raycasts and navigation use that same draw order.
 *
 * A `renderMode: 'screenSpace'` canvas root's rect (and its camera's
 * `verticalWorldUnits`) is recomputed from `renderContext`'s current
 * dimensions every call, so resizing the render destination is picked up
 * automatically on the next frame with no separate resize hook - this
 * system does a full recompute every frame rather than tracking dirty
 * state, favoring correctness over the added complexity dirty-tracking a
 * retained tree would need. Its camera's `renderTarget` (see
 * `createUiCanvas`) is canvas-sized, so the render context resizes it.
 *
 * A `renderMode: 'worldSpace'` canvas root is resolved exactly like any
 * other element instead - against its own parent's rect (or, with no UI
 * parent, as an ordinary root) - and its camera is never touched, since a
 * world-space canvas typically shares the game's own world camera.
 *
 * Also computes each canvas's current reference-pixel-to-screen-pixel ratio
 * (its camera's `CameraView.pixelsPerUnit`, which follows the camera's
 * zoom, re-derived from whichever camera that canvas root just resolved) and
 * threads it down through the whole subtree, so any descendant's
 * `'screenPixels'`-unit `UiAxis` size/margin (see `UiAxisSizeUnit`) converts
 * against the ratio that's actually live for the canvas it belongs to, not
 * a stale or unrelated one.
 *
 * Must be registered before `createTransformEcsSystem`.
 * @param renderContext - The render context UI canvases resolve their root
 * rect against.
 * @returns The UI layout ECS system.
 */
export const createUiLayoutEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[RectTransformEcsComponent, PositionEcsComponent]> => ({
  name: 'uiLayout',
  query: [rectTransformId, positionId],
  update: (world, { entities }) => {
    const elements = new Set(entities);
    const roots: number[] = [];

    // A canvas is always the root of its own tree, even when it's parented
    // to another element (so it follows that element's transform).
    const isTreeRoot = (entity: number): boolean => {
      const parent = world.getParent(entity);

      return (
        world.getComponent(entity, canvasId) !== null ||
        parent === null ||
        !elements.has(parent)
      );
    };

    for (const entity of entities) {
      if (isTreeRoot(entity)) {
        roots.push(entity);
      }
    }

    const visit = (
      entity: number,
      parentRect: Rect,
      parentPivotPosition: Vector2,
      pixelsPerUnit: number,
    ): void => {
      const rectTransform =
        world.getComponentRequired<RectTransformEcsComponent>(
          entity,
          rectTransformId,
        );
      const canvasComponent = world.getComponent<CanvasEcsComponent>(
        entity,
        canvasId,
      );

      const { rect, childPixelsPerUnit } = resolveEntityRect(
        world,
        renderContext,
        canvasComponent,
        rectTransform,
        parentRect,
        pixelsPerUnit,
      );

      rectTransform.rect = rect;

      const pivot = { x: rectTransform.x.pivot, y: rectTransform.y.pivot };
      const pivotPosition = pivotPositionOf(rect, pivot);

      const position = world.getComponentRequired<PositionEcsComponent>(
        entity,
        positionId,
      );

      position.local.x = pivotPosition.x - parentPivotPosition.x;
      position.local.y = pivotPosition.y - parentPivotPosition.y;

      const sprite = world.getComponent<SpriteEcsComponent>(entity, spriteId);

      if (sprite) {
        const size = Rects.size(rect);

        sprite.width = size.x;
        sprite.height = size.y;
        sprite.pivot.x = pivot.x;
        sprite.pivot.y = pivot.y;
      }

      const mask = world.getComponent<MaskEcsComponent>(entity, maskId);

      if (mask) {
        const size = Rects.size(rect);

        mask.width = size.x;
        mask.height = size.y;
        mask.pivot.x = pivot.x;
        mask.pivot.y = pivot.y;
      }

      const text = world.getComponent<TextEcsComponent>(entity, textId);

      if (text) {
        // A `UiStretchAxis`'s `margin` is a margin, not a width, so the
        // entity's resolved rect - not anything statically knowable at the
        // call site - is the only correct source for maxWidth here; a
        // full-width title bar's actual width, for instance, depends on the
        // render destination's live size. horizontalAlign/maxWidth-based
        // centering (see createButton) then keeps working with no
        // caller-side measurement even when the box itself is dynamically
        // sized. A point-anchored `x`'s maxWidth is left untouched - it's
        // the caller's own explicit choice (or unset, for a label that's
        // simply sized to its own content).
        //
        // `horizontalAlignPivot` is synced alongside it to `pivot.x` for
        // the same reason: `shapeText`'s alignment box is measured from the
        // entity's own local `x = 0`, which only lands on the resolved
        // rect's left edge for a `0` (left) pivot. Without this, any
        // stretch-x preset whose pivot isn't `0` - `UiAnchor.stretchAll`,
        // `stretchHorizontal`, `center`, and so on all default to a center
        // pivot - would silently offset centered/right/justified text away
        // from the panel it's actually meant to fill. Syncing this here
        // means every stretch-x anchor centers correctly regardless of
        // which pivot it uses, so callers no longer have to reach for a
        // left-pivoted preset (`stretchHorizontalLeft`/`stretchTopLeft`)
        // just to make `horizontalAlign` work.
        if (rectTransform.x.kind === 'stretch') {
          text.maxWidth = rect.max.x - rect.min.x;
          text.horizontalAlignPivot = pivot.x;
        }
      }

      for (const child of world.getChildren(entity)) {
        if (elements.has(child) && !isTreeRoot(child)) {
          visit(child, rect, pivotPosition, childPixelsPerUnit);
        }
      }
    };

    for (const root of roots) {
      visit(root, Rects.zero, { x: 0, y: 0 }, 1);
    }
  },
});
