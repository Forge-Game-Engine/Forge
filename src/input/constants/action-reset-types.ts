export const actionResetTypes = {
  noReset: 'noReset',
  zero: 'zero',
} as const;

export type ActionResetType =
  (typeof actionResetTypes)[keyof typeof actionResetTypes];
