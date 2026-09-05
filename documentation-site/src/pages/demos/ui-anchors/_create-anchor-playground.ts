import {
  RectTransformEcsComponent,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { TextEcsComponent } from '@forge-game-engine/forge/text';

/**
 * The `UiAnchor` presets exposed by the anchors playground's dropdown - the
 * nine point anchors plus the four edge-stretch presets and `stretchAll`.
 * `UiAnchor` also ships pivot variants (`stretchHorizontalLeft`,
 * `stretchTopLeft`, `stretchHorizontal`, `stretchVertical`) that exist for
 * text-alignment/manual-position edge cases rather than to teach anchoring,
 * so they're left out of this list.
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
 * Whether `presetName` stretches along a given axis (its `anchorMin` and
 * `anchorMax` differ on that axis) - `RectTransformDefaultedOptions.sizeOrMargin`
 * means "size" for a point anchor on that axis and "margin" for a stretch
 * one, which is what the controls' axis labels switch on.
 * @param presetName - The preset to check.
 * @returns Whether the x and y axes are each stretched.
 */
export function getAnchorStretchAxes(presetName: AnchorPlaygroundPresetName): {
  isStretchX: boolean;
  isStretchY: boolean;
} {
  const preset = UiAnchor[presetName];

  return {
    isStretchX: preset.anchorMin.x !== preset.anchorMax.x,
    isStretchY: preset.anchorMin.y !== preset.anchorMax.y,
  };
}

/**
 * Applies `presetName`'s anchor/pivot onto `playground.rectTransform` and
 * relabels the panel, leaving `anchoredPosition`/`sizeOrMargin` untouched so
 * the position/size sliders keep whatever the user last set them to -
 * switching anchors and re-tuning size/position are independent actions.
 * @param playground - The live playground to update.
 * @param presetName - The preset to switch to.
 */
export function setAnchorPlaygroundPreset(
  playground: AnchorPlayground,
  presetName: AnchorPlaygroundPresetName,
): void {
  const preset = UiAnchor[presetName];

  playground.rectTransform.anchorMin = { ...preset.anchorMin };
  playground.rectTransform.anchorMax = { ...preset.anchorMax };
  playground.rectTransform.pivot = { ...preset.pivot };
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
 * Sets `playground.rectTransform.sizeOrMargin` from the size/margin sliders.
 * @param playground - The live playground to update.
 * @param x - The new x size (point anchor) or margin (x-stretch anchor).
 * @param y - The new y size (point anchor) or margin (y-stretch anchor).
 */
export function setAnchorPlaygroundSizeOrMargin(
  playground: AnchorPlayground,
  x: number,
  y: number,
): void {
  playground.rectTransform.sizeOrMargin = { x, y };
}
