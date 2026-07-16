import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  TONE_MAPPING_OPERATOR,
  TONE_MAPPING_OPERATOR_KEYS,
} from '../enums/index.js';

/**
 * Configures the tone mapping post-process pass for whichever camera entity
 * this is attached to. See `createToneMapEcsSystem`.
 */
export interface ToneMappingEcsComponent {
  /**
   * Multiplies the camera's HDR color before `operator` compresses it into
   * displayable `[0, 1]` range. Values above `1` brighten the image before
   * the highlight rolloff kicks in; values below `1` darken it.
   */
  exposure: number;

  /**
   * Which curve compresses HDR color into `[0, 1]` range. See
   * `TONE_MAPPING_OPERATOR`.
   */
  operator: TONE_MAPPING_OPERATOR_KEYS;
}

export const toneMappingId =
  createComponentId<ToneMappingEcsComponent>('toneMapping');

const defaultToneMappingOptions: ToneMappingEcsComponent = {
  exposure: 1,
  operator: TONE_MAPPING_OPERATOR.aces,
};

/**
 * Attaches a {@link ToneMappingEcsComponent} to a camera entity, so
 * `createToneMapEcsSystem` compresses that camera's HDR render target back
 * into displayable `[0, 1]` range. Has no effect if the entity's camera
 * doesn't have a `renderTarget`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The camera entity to attach tone mapping to.
 * @param options - Options for configuring the tone mapping.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addToneMappingComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<ToneMappingEcsComponent> = {},
): ToneMappingEcsComponent {
  const component: ToneMappingEcsComponent = {
    ...defaultToneMappingOptions,
    ...options,
  };

  return world.addComponent(entity, toneMappingId, component);
}
