import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  calculatePixelsPerUnit,
  CameraEcsComponent,
  cameraId,
  RenderContext,
  SafeAreaInsets,
} from '../../rendering/index.js';
import {
  CanvasEcsComponent,
  canvasId,
} from '../components/canvas-component.js';
import {
  RectTransformEcsComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import {
  UiSafeAreaEcsComponent,
  uiSafeAreaId,
} from '../components/ui-safe-area-component.js';
import { UiAxis } from '../types/ui-axis.js';
import { findOwningCanvas } from '../utilities/find-owning-canvas.js';

/** The owning canvas's camera, resolved once per entity so the pixels-per-unit conversion matches whatever that canvas is actually showing. */
function resolveOwningCamera(
  world: EcsWorld,
  entity: number,
): CameraEcsComponent | null {
  const owningCanvas = findOwningCanvas(world, entity);

  if (owningCanvas === null) {
    return null;
  }

  const canvas = world.getComponent<CanvasEcsComponent>(owningCanvas, canvasId);

  return canvas
    ? world.getComponent<CameraEcsComponent>(canvas.camera, cameraId)
    : null;
}

/**
 * Creates a system that keeps every `UiSafeAreaEcsComponent` element's rect
 * clear of the live safe-area insets (see `getSafeAreaInsets`), converted
 * from CSS pixels into that element's canvas's own UI world units via
 * `calculatePixelsPerUnit` (the same conversion `resolveCanvasPointerPosition`
 * uses) - so the inset shrinks the rect by a consistent visual amount
 * regardless of the canvas's `scaleMode`/reference resolution. Assumes the
 * render destination fills the browser viewport, the same assumption
 * `getSafeAreaInsets` itself is only meaningful under.
 *
 * Rewrites the element's `x`/`y` (to a full stretch, `pivot: 0`, with
 * `margin` shrinking it by the inset on each enabled edge) and
 * `anchoredPosition` (offsetting it by the left/bottom insets) every frame
 * - `RectTransformEcsComponent`'s existing anchor/pivot/margin formula
 * already expresses independent per-edge insets exactly, so no new layout
 * math was needed. An entity anchored any other way than
 * `UiAnchor.stretchAll()` is overwritten into one, since a per-edge inset
 * only means something against a full parent span.
 *
 * Must be registered before `createUiLayoutEcsSystem` (which reads the
 * `x`/`y`/`anchoredPosition` this system writes).
 * @param renderContext - The render context canvases resolve their
 * pixels-per-unit against.
 * @param getSafeAreaInsets - Returns the current safe-area insets, in CSS
 * pixels - `getSafeAreaInsets` from `@forge-game-engine/forge/rendering`
 * satisfies this directly.
 * @returns The UI safe-area ECS system.
 */
export const createUiSafeAreaEcsSystem = (
  renderContext: RenderContext,
  getSafeAreaInsets: () => SafeAreaInsets,
): EcsSystem<[UiSafeAreaEcsComponent, RectTransformEcsComponent]> => ({
  name: 'uiSafeArea',
  query: [uiSafeAreaId, rectTransformId],
  update: (world, { entities, components: [safeAreas, rectTransforms] }) => {
    const insets = getSafeAreaInsets();

    for (let i = 0; i < entities.length; i++) {
      const safeArea = safeAreas[i];
      const rectTransform = rectTransforms[i];

      const camera = resolveOwningCamera(world, entities[i]);

      if (!camera) {
        continue;
      }

      const pixelsPerUnit = calculatePixelsPerUnit(
        renderContext.height,
        camera.verticalWorldUnits,
      );

      const left = safeArea.left ? insets.left / pixelsPerUnit : 0;
      const right = safeArea.right ? insets.right / pixelsPerUnit : 0;
      const top = safeArea.top ? insets.top / pixelsPerUnit : 0;
      const bottom = safeArea.bottom ? insets.bottom / pixelsPerUnit : 0;

      rectTransform.x = UiAxis.stretch(
        { min: 0, max: 1 },
        { pivot: 0, margin: -(left + right) },
      );
      rectTransform.y = UiAxis.stretch(
        { min: 0, max: 1 },
        { pivot: 0, margin: -(bottom + top) },
      );
      rectTransform.anchoredPosition = { x: left, y: bottom };
    }
  },
});
