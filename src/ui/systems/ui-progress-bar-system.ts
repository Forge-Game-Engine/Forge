import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  normalizeUiProgressBarValue,
  UiProgressBarEcsComponent,
  uiProgressBarId,
} from '../components/ui-progress-bar-component.js';
import { driveUiFillMask } from '../utilities/drive-ui-fill-mask.js';

/**
 * Creates a system that reveals a `UiProgressBarEcsComponent`'s fill from
 * `value` every tick: it writes the normalized value into the `amount` of
 * the fill's linear or radial `MaskEcsComponent`, so the fill keeps its
 * full size (a nine-slice fill keeps its end caps) and only the part the
 * value covers shows. It's the only writer of that `amount`.
 *
 * `registerUiSystems` registers this once per world, before
 * `createUiLayoutEcsSystem`, so a `value` write and the fill visual it
 * produces land in the same frame - unlike `createUiSliderEcsSystem`, which
 * has to run after the interaction pipeline and so lags a frame.
 * @returns The UI progress bar ECS system.
 * @throws From `update`: an error if a progress bar's fill has no linear
 * or radial mask.
 */
export const createUiProgressBarEcsSystem = (): EcsSystem<
  [UiProgressBarEcsComponent]
> => ({
  name: 'uiProgressBar',
  query: [uiProgressBarId],
  update: (world, { components: [progressBars] }) => {
    for (const progressBar of progressBars) {
      driveUiFillMask(
        world,
        progressBar.fill,
        normalizeUiProgressBarValue(progressBar),
        'progress bar',
      );
    }
  },
});
