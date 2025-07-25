export const axisMeasurements = {
  absolute: 'absolute',
  delta: 'delta',
} as const;

export type AxisMeasurement =
  (typeof axisMeasurements)[keyof typeof axisMeasurements];
