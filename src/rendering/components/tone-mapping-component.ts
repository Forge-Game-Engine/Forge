import { createComponentId } from '../../ecs/ecs-component.js';
import { TONE_MAPPING_OPERATOR_KEYS } from '../enums/index.js';

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
