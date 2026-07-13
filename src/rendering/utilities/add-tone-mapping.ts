import { EcsWorld } from '../../ecs/ecs-world.js';
import { ToneMappingEcsComponent, toneMappingId } from '../components/index.js';
import { TONE_MAPPING_OPERATOR } from '../enums/index.js';

const defaultToneMappingOptions = {
  exposure: 1,
  operator: TONE_MAPPING_OPERATOR.aces,
};

/**
 * Attaches a `ToneMappingEcsComponent` to a camera entity, so
 * `createToneMapEcsSystem` compresses that camera's HDR render target back
 * into displayable `[0, 1]` range. Has no effect if the entity's camera
 * doesn't have a `renderTarget`.
 *
 * @param world - The ECS world the camera entity belongs to.
 * @param cameraEntity - The camera entity to attach tone mapping to.
 * @param options - Options for configuring the tone mapping.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addToneMapping(
  world: EcsWorld,
  cameraEntity: number,
  options: Partial<ToneMappingEcsComponent> = {},
): ToneMappingEcsComponent {
  const { exposure, operator } = {
    ...defaultToneMappingOptions,
    ...options,
  };

  return world.addComponent(cameraEntity, toneMappingId, {
    exposure,
    operator,
  });
}
