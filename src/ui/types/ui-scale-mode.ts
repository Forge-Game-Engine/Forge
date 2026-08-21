/**
 * Controls how a `CanvasEcsComponent`'s root rect (and, in turn, its UI
 * camera's `verticalWorldUnits`) responds to the render destination's
 * current size, resolved fresh every frame by `createUiLayoutEcsSystem`.
 */
export const uiScaleModes = {
  /**
   * The root rect's height stays pinned to `referenceResolution.y`
   * regardless of the destination's size; its width follows the
   * destination's live aspect ratio. The default - a UI authored at the
   * reference resolution reads at the same relative size on any screen
   * height.
   */
  scaleWithScreenSize: 'scaleWithScreenSize',

  /**
   * The root rect's width stays pinned to `referenceResolution.x`; its
   * height is recomputed every frame from the destination's live aspect
   * ratio. Prefer this over `scaleWithScreenSize` when a UI's horizontal
   * layout (e.g. a fixed-width side panel) matters more than its vertical
   * one.
   */
  matchWidth: 'matchWidth',

  /**
   * The root rect matches the render destination's actual pixel dimensions
   * one-to-one, ignoring `referenceResolution` entirely - 1 UI world unit is
   * always exactly 1 screen pixel. UI elements keep a constant on-screen
   * size regardless of resolution, at the cost of taking up a different
   * fraction of the screen on different displays.
   */
  constantPixelSize: 'constantPixelSize',
} as const;

/** The scale mode of a `CanvasEcsComponent`. See {@link uiScaleModes}. */
export type UiScaleMode = (typeof uiScaleModes)[keyof typeof uiScaleModes];
