/**
 * The `DEFAULT_LAYERS` object defines the default layer names for rendering.
 */
export const DEFAULT_LAYERS = {
  /** The background layer. */
  background: 'background',

  /** The foreground layer. */
  foreground: 'foreground',

  /** The UI layer. */
  ui: 'ui',
} as const;

/**
 * The `DEFAULT_LAYER_NAMES` array contains the values of the `DEFAULT_LAYERS` object.
 */
export const DEFAULT_LAYER_NAMES = Object.values(DEFAULT_LAYERS);
