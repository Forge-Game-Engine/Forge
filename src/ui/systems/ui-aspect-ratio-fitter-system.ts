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

/**
 * Creates a system that keeps every `AspectRatioFitterEcsComponent`'s
 * `RectTransformEcsComponent.sizeOrMargin` at its configured `aspectRatio` -
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
        rectTransform.sizeOrMargin.y =
          rectTransform.sizeOrMargin.x / aspectRatio;

        continue;
      }

      if (aspectMode === 'heightControlsWidth') {
        rectTransform.sizeOrMargin.x =
          rectTransform.sizeOrMargin.y * aspectRatio;

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
        rectTransform.sizeOrMargin.y = parentSize.y;
        rectTransform.sizeOrMargin.x = parentSize.y * aspectRatio;
      } else {
        rectTransform.sizeOrMargin.x = parentSize.x;
        rectTransform.sizeOrMargin.y = parentSize.x / aspectRatio;
      }
    }
  },
});
