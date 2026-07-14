/**
 * Type representing the keys of the `TONE_MAPPING_OPERATOR` object.
 */
export type TONE_MAPPING_OPERATOR_KEYS =
  (typeof TONE_MAPPING_OPERATOR)[keyof typeof TONE_MAPPING_OPERATOR];

/**
 * The `TONE_MAPPING_OPERATOR` lookup defines the curve `createToneMapEcsSystem`
 * uses to compress HDR color into displayable `[0, 1]` range.
 */
export const TONE_MAPPING_OPERATOR = {
  /** A simple `color / (color + 1)` curve: cheap, but desaturates highlights. */
  reinhard: 'reinhard',

  /** The Narkowicz ACES filmic fit: a cinematic highlight rolloff. */
  aces: 'aces',
} as const;
