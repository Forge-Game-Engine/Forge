import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  GaussianBlurEcsComponent,
  gaussianBlurId,
} from '../components/index.js';

const defaultGaussianBlurOptions = { passes: 4, intensity: 1 };

/**
 * Attaches a `GaussianBlurEcsComponent` to a camera entity, so
 * `createGaussianBlurEcsSystem` blurs that camera's `renderTarget`. Has no
 * effect if the entity's camera doesn't have a `renderTarget`.
 *
 * @param world - The ECS world the camera entity belongs to.
 * @param cameraEntity - The camera entity to attach the blur to.
 * @param options - Options for configuring the blur.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addGaussianBlur(
  world: EcsWorld,
  cameraEntity: number,
  options: Partial<GaussianBlurEcsComponent> = {},
): GaussianBlurEcsComponent {
  const { passes, intensity } = { ...defaultGaussianBlurOptions, ...options };

  return world.addComponent(cameraEntity, gaussianBlurId, {
    passes,
    intensity,
  });
}
