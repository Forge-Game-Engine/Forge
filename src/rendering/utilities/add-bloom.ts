import { EcsWorld } from '../../ecs/ecs-world.js';
import { BloomEcsComponent, bloomId } from '../components/index.js';

const defaultBloomOptions = { threshold: 0.8, passes: 4, intensity: 1 };

/**
 * Attaches a `BloomEcsComponent` to a camera entity, so
 * `createBloomEcsSystem` adds a glow around that camera's brightest pixels.
 * Has no effect if the entity's camera doesn't have a `renderTarget`.
 *
 * @param world - The ECS world the camera entity belongs to.
 * @param cameraEntity - The camera entity to attach the bloom to.
 * @param options - Options for configuring the bloom.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addBloom(
  world: EcsWorld,
  cameraEntity: number,
  options: Partial<BloomEcsComponent> = {},
): BloomEcsComponent {
  const { threshold, passes, intensity } = {
    ...defaultBloomOptions,
    ...options,
  };

  return world.addComponent(cameraEntity, bloomId, {
    threshold,
    passes,
    intensity,
  });
}
