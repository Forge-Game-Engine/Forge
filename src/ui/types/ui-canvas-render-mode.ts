/**
 * Controls how a `CanvasEcsComponent` is positioned and drawn. See
 * `createUiCanvas`'s `renderMode` option.
 */
export const uiCanvasRenderModes = {
  /**
   * The default. The canvas's root rect is resolved fresh every frame from
   * the render destination's live size and `referenceResolution`/
   * `scaleMode` (see `createUiLayoutEcsSystem`), and drawn through a
   * dedicated, static UI camera `createUiCanvas` creates for it - screen
   * overlay UI: HUDs, menus, dialogs.
   */
  screenSpace: 'screenSpace',

  /**
   * The canvas's root rect is an ordinary `RectTransformEcsComponent`,
   * sized/anchored like any other UI element and positioned via the normal
   * entity hierarchy (`addParentComponent(world, canvas, { parent: enemy })`
   * puts a canvas above an entity's head) rather than the render
   * destination's size. Drawn through whichever camera `createUiCanvas`'s
   * `camera` option names - typically the game's own world camera, so the
   * canvas pans, zooms, and (if parented to a rotating/moving entity) moves
   * with the world exactly like any other sprite - diegetic UI: health
   * bars, name tags, floating damage numbers with a persistent rect rather
   * than one-off text.
   *
   * `referenceResolution`/`scaleMode` have no effect in this mode -
   * there's no "destination size" for a canvas embedded in the world to
   * scale against.
   */
  worldSpace: 'worldSpace',
} as const;

/** The render mode of a `CanvasEcsComponent`. See {@link uiCanvasRenderModes}. */
export type UiCanvasRenderMode =
  (typeof uiCanvasRenderModes)[keyof typeof uiCanvasRenderModes];
