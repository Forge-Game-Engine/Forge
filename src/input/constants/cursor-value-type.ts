/** Defines the types of axis measurements available for input axes. */
export const cursorValueTypes = {
  /** The axis value is an absolute measurement. */
  absolute: 'absolute',
  /** The axis value normalized to [0..1] where the top-left of the container is (0, 0) and the bottom-right is (1, 1) */
  screenSpaceRatio: 'screenSpaceRatio',
  /** The axis value normalized to [-1..1] where the center of the container is (0, 0) and the top-left is (-1, -1) and the bottom-right is (1, 1) */
  centerSpaceRatio: 'centerSpaceRatio',
} as const;

/** The type of cursor value. */
export type CursorValueType =
  (typeof cursorValueTypes)[keyof typeof cursorValueTypes];
