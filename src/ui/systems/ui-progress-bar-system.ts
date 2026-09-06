import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  normalizeUiProgressBarValue,
  UiProgressBarEcsComponent,
  uiProgressBarId,
} from '../components/ui-progress-bar-component.js';
import {
  RectTransformEcsComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import { driveUiAxis } from '../types/ui-axis.js';

/**
 * Creates a system that drives a `UiProgressBarEcsComponent`'s fill entity
 * `anchorMax.x` from `value` every tick - the same "normalize, then anchor a
 * stretch rect to it" mechanism `createUiSliderEcsSystem` uses for a
 * slider's fill, without the drag handling a progress bar has no need for.
 *
 * `createUiCanvas` registers this once per world, before
 * `createUiLayoutEcsSystem`, so a `value` write and the fill visual it
 * produces land in the same frame - unlike `createUiSliderEcsSystem`, which
 * has to run after the interaction pipeline and so lags a frame.
 * @returns The UI progress bar ECS system.
 */
export const createUiProgressBarEcsSystem = (): EcsSystem<
  [UiProgressBarEcsComponent]
> => ({
  name: 'uiProgressBar',
  query: [uiProgressBarId],
  update: (world, { components: [progressBars] }) => {
    for (const progressBar of progressBars) {
      const fillRectTransform = world.getComponent<RectTransformEcsComponent>(
        progressBar.fill,
        rectTransformId,
      );

      if (fillRectTransform) {
        driveUiAxis(
          fillRectTransform.x,
          normalizeUiProgressBarValue(progressBar),
        );
      }
    }
  },
});
