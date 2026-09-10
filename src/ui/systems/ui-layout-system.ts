import {
  ParentEcsComponent,
  parentId,
  PositionEcsComponent,
  positionId,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { Rect, Rects, Vector2 } from '../../math/index.js';
import {
  CameraEcsComponent,
  cameraId,
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
 * Centered at the origin, matching the world camera's own projection
 * convention.
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
    worldHeight = renderContext.height;
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
 * Creates a system that resolves every `RectTransformEcsComponent` against
 * its parent's rect, top-down, in hierarchy pre-order starting from each
 * `CanvasEcsComponent`'s root. For each element it writes the resolved
 * `RectTransformEcsComponent.rect`, the entity's `PositionEcsComponent.local`
 * (so the existing `createTransformEcsSystem` composes the correct
 * `position.world`), and `RectTransformEcsComponent.sortDepth` - and, for
 * elements that also carry a `SpriteEcsComponent` and/or a
 * `TextEcsComponent`, their `sortDepth` too (plus, for a sprite, its
 * `width`/`height`/`pivot`) - all set to the element's hierarchy pre-order
 * index, so draw order follows hierarchy order within a canvas regardless
 * of whether a panel and its label happen to share a world Y (draw order
 * otherwise ties on `position.world.y`, which a panel and a centered child
 * label routinely don't share), and `createUiRaycastEcsSystem` has a
 * topmost-first ordering for every interactable regardless of whether it
 * happens to draw anything.
 *
 * A `renderMode: 'screenSpace'` canvas root's rect (and its camera's
 * `verticalWorldUnits`) is recomputed from `renderContext`'s current
 * dimensions every call, so resizing the render destination is picked up
 * automatically on the next frame with no separate resize hook - this
 * system does a full recompute every frame rather than tracking dirty
 * state, favoring correctness over the added complexity dirty-tracking a
 * retained tree would need. Its camera's `renderTarget`, if it has one (see
 * `createUiCanvas`), is resized to match `renderContext` the same way, so
 * the UI's own off-screen target never drifts out of sync with the
 * destination it's composited onto.
 *
 * A `renderMode: 'worldSpace'` canvas root is resolved exactly like any
 * other element instead - against its own parent's rect (or, with no UI
 * parent, as an ordinary root) - and its camera is never touched, since a
 * world-space canvas typically shares the game's own world camera.
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
    const childrenByParent = new Map<number, number[]>();
    const roots: number[] = [];

    for (const entity of entities) {
      const canvasComponent = world.getComponent(entity, canvasId);
      const parentComponent = world.getComponent<ParentEcsComponent>(
        entity,
        parentId,
      );

      if (
        canvasComponent ||
        !parentComponent ||
        !elements.has(parentComponent.parent)
      ) {
        roots.push(entity);

        continue;
      }

      let children = childrenByParent.get(parentComponent.parent);

      if (!children) {
        children = [];
        childrenByParent.set(parentComponent.parent, children);
      }

      children.push(entity);
    }

    let sortDepth = 0;
    const visited = new Set<number>();

    const visit = (
      entity: number,
      parentRect: Rect,
      parentPivotPosition: Vector2,
    ): void => {
      if (visited.has(entity)) {
        return;
      }

      visited.add(entity);

      const rectTransform = world.getComponent<RectTransformEcsComponent>(
        entity,
        rectTransformId,
      )!;
      const canvasComponent = world.getComponent<CanvasEcsComponent>(
        entity,
        canvasId,
      );

      let rect: Rect;

      if (
        canvasComponent &&
        canvasComponent.renderMode === uiCanvasRenderModes.screenSpace
      ) {
        const resolved = resolveCanvasRootRect(renderContext, canvasComponent);
        rect = resolved.rect;

        const camera = world.getComponent<CameraEcsComponent>(
          canvasComponent.camera,
          cameraId,
        );

        if (camera) {
          camera.verticalWorldUnits = resolved.worldHeight;

          const { renderTarget } = camera;

          if (
            renderTarget &&
            (renderTarget.width !== renderContext.width ||
              renderTarget.height !== renderContext.height)
          ) {
            renderTarget.resize(
              renderContext.gl,
              renderContext.width,
              renderContext.height,
            );
          }
        }
      } else {
        rect = resolveRect(parentRect, rectTransform);
      }

      rectTransform.rect = rect;
      rectTransform.sortDepth = sortDepth;

      const pivot = { x: rectTransform.x.pivot, y: rectTransform.y.pivot };
      const pivotPosition = pivotPositionOf(rect, pivot);

      const position = world.getComponent<PositionEcsComponent>(
        entity,
        positionId,
      )!;

      position.local.x = pivotPosition.x - parentPivotPosition.x;
      position.local.y = pivotPosition.y - parentPivotPosition.y;

      const sprite = world.getComponent<SpriteEcsComponent>(entity, spriteId);

      if (sprite) {
        const size = Rects.size(rect);

        sprite.width = size.x;
        sprite.height = size.y;
        sprite.pivot.x = pivot.x;
        sprite.pivot.y = pivot.y;
        sprite.sortDepth = sortDepth;
      }

      const text = world.getComponent<TextEcsComponent>(entity, textId);

      if (text) {
        text.sortDepth = sortDepth;

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

      sortDepth += 1;

      for (const child of childrenByParent.get(entity) ?? []) {
        visit(child, rect, pivotPosition);
      }
    };

    for (const root of roots) {
      visit(root, Rects.zero, { x: 0, y: 0 });
    }
  },
});
