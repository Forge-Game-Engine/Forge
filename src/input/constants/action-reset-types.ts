/** Defines the types of action resets available for input actions. */
export const actionResetTypes = {
  /**
   * The action will not reset.
   */
  noReset: 'noReset',
  /** The action will reset to a zero value. */
  zero: 'zero',
} as const;

/** The type of action reset. */
export type ActionResetType =
  (typeof actionResetTypes)[keyof typeof actionResetTypes];
