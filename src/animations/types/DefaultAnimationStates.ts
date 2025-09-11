export type DEFAULT_ANIMATION_STATES_KEYS =
  (typeof DEFAULT_ANIMATION_STATES)[keyof typeof DEFAULT_ANIMATION_STATES];

export const DEFAULT_ANIMATION_STATES = {
  entry: 'entry',
  any: 'any',
} as const;
