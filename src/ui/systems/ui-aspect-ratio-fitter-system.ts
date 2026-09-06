import { ParentEcsComponent, parentId } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { Rects } from '../../math/index.js';
import {
  AspectRatioFitterEcsComponent,
  aspectRatioFitterId,
} from '../components/aspect-ratio-fitter-component.js';
import {
  RectTransformEcsComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import { uiAxisValue, withUiAxisValue } from '../types/ui-axis.js';

/**
 * Creates a system that keeps every `AspectRatioFitterEcsComponent`'s
 * `RectTransformEcsComponent`'s own size at its configured `aspectRatio` -
 * `widthControlsHeight`/`heightControlsWidth` derive one axis from the
 * other; `fitInParent`/`envelopeParent` derive both axes from the parent's
 * own resolved `rect` (one frame stale, like every other cross-entity read
 * in this module - see `createUiLayoutEcsSystem`'s own doc comment), and
 * are a no-op for an entity with no `ParentEcsComponent`.
 *
 * Must be registered before `createUiLayoutEcsSystem`.
 * @returns The UI aspect ratio fitter ECS system.
 */
export const createUiAspectRatioFitterEcsSystem = (): EcsSystem<
  [AspectRatioFitterEcsComponent, RectTransformEcsComponent]
> => ({
  name: 'uiAspectRatioFitter',
  query: [aspectRatioFitterId, rectTransformId],
  update: (world, { entities, components: [fitters, rectTransforms] }) => {
    for (let i = 0; i < entities.length; i++) {
      const fitter = fitters[i];
      const rectTransform = rectTransforms[i];
      const { aspectMode, aspectRatio } = fitter;

      if (aspectMode === 'widthControlsHeight') {
        rectTransform.y = withUiAxisValue(
          rectTransform.y,
          uiAxisValue(rectTransform.x) / aspectRatio,
        );

        continue;
      }

      if (aspectMode === 'heightControlsWidth') {
        rectTransform.x = withUiAxisValue(
          rectTransform.x,
          uiAxisValue(rectTransform.y) * aspectRatio,
        );

        continue;
      }

      const parentComponent = world.getComponent<ParentEcsComponent>(
        entities[i],
        parentId,
      );

      if (!parentComponent) {
        continue;
      }

      const parentRectTransform = world.getComponent<RectTransformEcsComponent>(
        parentComponent.parent,
        rectTransformId,
      );

      if (!parentRectTransform) {
        continue;
      }

      const parentSize = Rects.size(parentRectTransform.rect);
      const parentAspectRatio = parentSize.x / parentSize.y;
      const isHeightBound =
        aspectMode === 'fitInParent'
          ? parentAspectRatio > aspectRatio
          : parentAspectRatio < aspectRatio;

      if (isHeightBound) {
        rectTransform.y = withUiAxisValue(rectTransform.y, parentSize.y);
        rectTransform.x = withUiAxisValue(
          rectTransform.x,
          parentSize.y * aspectRatio,
        );
      } else {
        rectTransform.x = withUiAxisValue(rectTransform.x, parentSize.x);
        rectTransform.y = withUiAxisValue(
          rectTransform.y,
          parentSize.x / aspectRatio,
        );
      }
    }
  },
});
