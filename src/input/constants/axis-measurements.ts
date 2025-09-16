/** Defines the types of axis measurements available for input axes. */
export const axisMeasurements = {
  /** The axis value is an absolute measurement. */
  absolute: 'absolute',
  /** The axis value is a delta measurement (change since last measurement). */
  delta: 'delta',
} as const;

/** The type of axis measurement. */
export type AxisMeasurement =
  (typeof axisMeasurements)[keyof typeof axisMeasurements];
