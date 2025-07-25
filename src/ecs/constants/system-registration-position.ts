export type SystemRegistrationPosition =
  (typeof systemRegistrationPositions)[keyof typeof systemRegistrationPositions];

export const systemRegistrationPositions = {
  early: 5000,
  normal: 10000,
  late: 15000,
} as const;
