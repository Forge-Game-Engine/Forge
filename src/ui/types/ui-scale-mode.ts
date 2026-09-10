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

  /**
   * The root rect is always at least `referenceResolution` on both axes -
   * whichever of `scaleWithScreenSize`'s or `matchWidth`'s height it would
   * produce is larger, letterboxing or pillarboxing the destination's
   * excess space on whichever axis isn't the limiting one. Unlike either of
   * those two modes alone, a UI built to fill the full reference resolution
   * (e.g. content anchored out to all four edges) never gets cropped or
   * squashed below its authored size, at any destination aspect ratio - the
   * tradeoff is that a destination whose aspect ratio doesn't match
   * `referenceResolution`'s always shows some letterbox/pillarbox space
   * `scaleWithScreenSize`/`matchWidth` wouldn't have.
   */
  fitReferenceResolution: 'fitReferenceResolution',
} as const;

/** The scale mode of a `CanvasEcsComponent`. See {@link uiScaleModes}. */
export type UiScaleMode = (typeof uiScaleModes)[keyof typeof uiScaleModes];
