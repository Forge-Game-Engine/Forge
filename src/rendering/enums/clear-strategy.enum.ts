/**
 * Type representing the keys of the `CLEAR_STRATEGY` object.
 */
export type CLEAR_STRATEGY_KEYS =
  (typeof CLEAR_STRATEGY)[keyof typeof CLEAR_STRATEGY];

/**
 * The `CLEAR_STRATEGY` lookup defines different strategies for clearing the rendering context.
 */
export const CLEAR_STRATEGY = {
  /** No clearing strategy. */
  none: 'none',

  /** Clear the context to a blank state. */
  blank: 'blank',
} as const;
