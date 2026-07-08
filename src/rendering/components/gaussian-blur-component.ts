import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * Configures the two-pass separable Gaussian blur post-process effect for
 * whichever camera entity this is attached to. See
 * `createGaussianBlurEcsSystem`.
 */
export interface GaussianBlurEcsComponent {
  /**
   * How many times to run the horizontal+vertical blur pair. Each pass
   * samples adjacent texels only, so increasing `passes` (rather than the
   * distance between samples) is what makes the blur stronger: repeated
   * narrow passes compose into a wide, smooth blur, whereas spacing samples
   * further apart undersamples the image and produces visible banding.
   */
  passes: number;

  /**
   * How much of the blur to show, from `0` (the sharp, unblurred scene) to
   * `1` (the scene fully blurred by `passes`). Values in between blend
   * smoothly between the two, for finer control than `passes` alone can
   * give: `passes` sets the underlying blur's softness, `intensity` dials
   * how strongly it shows. Clamped to the `[0, 1]` range when applied.
   */
  intensity: number;
}

export const gaussianBlurId =
  createComponentId<GaussianBlurEcsComponent>('gaussianBlur');
