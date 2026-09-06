import {
  RectTransformEcsComponent,
  UiAnchor,
  UiAnchorConfig,
  uiAxisValue,
  withUiAxisValue,
} from '@forge-game-engine/forge/ui';
import { TextEcsComponent } from '@forge-game-engine/forge/text';
import { Vector2 } from '@forge-game-engine/forge/math';

/**
 * The `UiAnchor` presets exposed by the anchors playground's dropdown - the
 * nine point anchors plus the four edge-stretch presets and `stretchAll`.
 * `UiAnchor` also ships pivot variants (`stretchHorizontalLeft`,
 * `stretchTopLeft`, `stretchTopRight`, `stretchHorizontal`,
 * `stretchVertical`) that exist for text-alignment/manual-position edge
 * cases rather than to teach anchoring, so they're left out of this list.
 */
export const anchorPlaygroundPresetNames = [
  'topLeft',
  'topCenter',
  'topRight',
  'middleLeft',
  'center',
  'middleRight',
  'bottomLeft',
  'bottomCenter',
  'bottomRight',
  'stretchTop',
  'stretchBottom',
  'stretchLeft',
  'stretchRight',
  'stretchAll',
] as const;

export type AnchorPlaygroundPresetName =
  (typeof anchorPlaygroundPresetNames)[number];

/**
 * Builds each playground preset's `UiAnchorConfig` from a single `{x, y}`
 * pair, so the rest of this module (and the sliders in `_PlaygroundControls.tsx`)
 * can treat every preset uniformly, without needing to know which of
 * `UiAnchor`'s differently-shaped preset factories (`Vector2` for the point
 * presets and `stretchAll`, `{height, horizontalMargin}`/`{width,
 * verticalMargin}` for the edge-stretch bands) a given preset name actually
 * takes. `x`/`y` mean a literal size on a point-anchored axis and a margin
 * on a stretch-anchored one - exactly what `getAnchorStretchAxes` reports
 * per preset.
 */
export const anchorPlaygroundConfigBuilders: Record<
  AnchorPlaygroundPresetName,
  (size: Vector2) => UiAnchorConfig
> = {
  topLeft: UiAnchor.topLeft,
  topCenter: UiAnchor.topCenter,
  topRight: UiAnchor.topRight,
  middleLeft: UiAnchor.middleLeft,
  center: UiAnchor.center,
  middleRight: UiAnchor.middleRight,
  bottomLeft: UiAnchor.bottomLeft,
  bottomCenter: UiAnchor.bottomCenter,
  bottomRight: UiAnchor.bottomRight,
  stretchTop: ({ x, y }) =>
    UiAnchor.stretchTop({ height: y, horizontalMargin: x }),
  stretchBottom: ({ x, y }) =>
    UiAnchor.stretchBottom({ height: y, horizontalMargin: x }),
  stretchLeft: ({ x, y }) =>
    UiAnchor.stretchLeft({ width: x, verticalMargin: y }),
  stretchRight: ({ x, y }) =>
    UiAnchor.stretchRight({ width: x, verticalMargin: y }),
  stretchAll: UiAnchor.stretchAll,
};

/** The values the anchors playground's controls start at (see `_PlaygroundControls.tsx`). */
export const anchorPlaygroundDefaults = {
  presetName: 'center' as AnchorPlaygroundPresetName,
  anchoredPositionX: 0,
  anchoredPositionY: 0,
  minAnchoredPosition: -400,
  maxAnchoredPosition: 400,
  sizeOrMarginX: 260,
  sizeOrMarginY: 96,
  minSizeOrMargin: -100,
  maxSizeOrMargin: 500,
};

/**
 * The playground panel's live components, set once `_create-game.ts`
 * finishes building it - `_PlaygroundControls.tsx`'s handlers mutate these
 * directly, the same way the text demo's playground mutates a live
 * `TextEcsComponent`.
 */
export interface AnchorPlayground {
  /** The live `RectTransformEcsComponent` the controls mutate directly. */
  rectTransform: RectTransformEcsComponent;

  /** The live label text component, rewritten to name the current preset. */
  labelText: TextEcsComponent;
}

/**
 * Whether `presetName` stretches along a given axis - a `UiStretchAxis`
 * resizes with the parent (`margin` added to the anchored span), while a
 * `UiPointAxis` keeps a literal `size` and moves with the anchor. This is
 * what the controls' axis labels ("Width"/"Height" vs "Margin X"/"Margin Y")
 * switch on. The `{x: 0, y: 0}` passed in only matters for its `kind`, never
 * read here - `anchorPlaygroundConfigBuilders` always produces the same
 * axis `kind`s for a given preset name regardless of the size/margin values
 * passed to it.
 * @param presetName - The preset to check.
 * @returns Whether the x and y axes are each stretched.
 */
export function getAnchorStretchAxes(presetName: AnchorPlaygroundPresetName): {
  isStretchX: boolean;
  isStretchY: boolean;
} {
  const config = anchorPlaygroundConfigBuilders[presetName]({ x: 0, y: 0 });

  return {
    isStretchX: config.x.kind === 'stretch',
    isStretchY: config.y.kind === 'stretch',
  };
}

/**
 * Applies `presetName`'s anchor/pivot onto `playground.rectTransform` and
 * relabels the panel, carrying over whatever size/margin value each axis
 * already had (read back via `uiAxisValue`, since it's a literal size on a
 * point axis but a margin on a stretch one) so the position/size sliders
 * keep whatever the user last set them to - switching anchors and re-tuning
 * size/position are independent actions.
 * @param playground - The live playground to update.
 * @param presetName - The preset to switch to.
 */
export function setAnchorPlaygroundPreset(
  playground: AnchorPlayground,
  presetName: AnchorPlaygroundPresetName,
): void {
  const currentSize: Vector2 = {
    x: uiAxisValue(playground.rectTransform.x),
    y: uiAxisValue(playground.rectTransform.y),
  };
  const config = anchorPlaygroundConfigBuilders[presetName](currentSize);

  playground.rectTransform.x = config.x;
  playground.rectTransform.y = config.y;
  playground.labelText.text = presetName;
}

/**
 * Sets `playground.rectTransform.anchoredPosition` from the position sliders.
 * @param playground - The live playground to update.
 * @param x - The new x offset, in reference pixels.
 * @param y - The new y offset, in reference pixels.
 */
export function setAnchorPlaygroundPosition(
  playground: AnchorPlayground,
  x: number,
  y: number,
): void {
  playground.rectTransform.anchoredPosition = { x, y };
}

/**
 * Sets `playground.rectTransform`'s `x`/`y` size or margin from the
 * size/margin sliders, preserving each axis's current `kind` (and anchor
 * value(s)/pivot) - only the literal size (a point axis) or margin (a
 * stretch axis) changes.
 * @param playground - The live playground to update.
 * @param x - The new x size (point anchor) or margin (x-stretch anchor).
 * @param y - The new y size (point anchor) or margin (y-stretch anchor).
 */
export function setAnchorPlaygroundSizeOrMargin(
  playground: AnchorPlayground,
  x: number,
  y: number,
): void {
  playground.rectTransform.x = withUiAxisValue(playground.rectTransform.x, x);
  playground.rectTransform.y = withUiAxisValue(playground.rectTransform.y, y);
}
