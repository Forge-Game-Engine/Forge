import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * Configures the additive bloom post-process effect for whichever camera
 * entity this is attached to. See `createBloomEcsSystem`.
 */
export interface BloomEcsComponent {
  /**
   * The relative luminance (`0` to `1`) above which pixels start
   * contributing to the bloom glow. Pixels at or below this are excluded
   * entirely; the contribution fades in smoothly just above it (rather than
   * cutting off sharply) so bright shapes don't get a hard-edged halo.
   */
  threshold: number;

  /**
   * How many times to run the horizontal+vertical blur pair over the
   * bright pixels above `threshold` before adding them back onto the
   * scene. Works the same as `GaussianBlurEcsComponent.passes`: higher
   * values produce a wider, softer glow.
   */
  passes: number;

  /**
   * How strongly the blurred bright pixels are added back onto the scene.
   * `0` disables bloom entirely; `1` adds them at their original
   * brightness. Unlike `GaussianBlurEcsComponent.intensity` this isn't a
   * blend factor and isn't clamped to `1`: values above `1` are valid and
   * produce a stronger glow.
   */
  intensity: number;
}

export const bloomId = createComponentId<BloomEcsComponent>('bloom');
