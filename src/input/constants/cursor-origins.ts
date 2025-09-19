/** Defines the origin points available for cursor measurements. */
export const cursorOrigins = {
  /** The origin is the top-left of the container. */
  topLeft: 'topLeft',
  /** The origin is the center of the container. */
  center: 'center',
} as const;

/** The origin point for cursor measurements. */
export type CursorOrigin = (typeof cursorOrigins)[keyof typeof cursorOrigins];
