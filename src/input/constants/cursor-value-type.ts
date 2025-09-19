/** Defines the types of axis measurements available for input axes. */
export const cursorValueTypes = {
  /** The axis value is an absolute measurement. */
  absolute: 'absolute',
  /** The axis value is a measurement relative to the width of the screen */
  ratio: 'ratio',
} as const;

/** The type of cursor value. */
export type CursorValueType =
  (typeof cursorValueTypes)[keyof typeof cursorValueTypes];
