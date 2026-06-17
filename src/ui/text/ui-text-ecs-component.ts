import { createComponentId } from '../../ecs/ecs-component.js';
import { Color } from '../../rendering/color.js';
import { Renderable } from '../../rendering/renderable.js';
import type { FontAsset } from './types/font-asset.js';
import type {
  ShapedText,
  TextAlign,
  TextOverflow,
  TextVerticalAlign,
  TextWrap,
} from './shape-text.js';
import type { TextGlyphInstanceComponents } from './text-instance-layout.js';

/**
 * Attaches SDF text rendering data to a UI entity.
 *
 * Mutating `text`, `font`, `fontSize`, `color`, `align`, `verticalAlign`,
 * `wrap`, or `overflow` should be accompanied by setting `_dirty = true` so
 * the text system reshapes the string on the next frame.
 *
 * The `renderable` field is a `Renderable<TextGlyphInstanceComponents>` created
 * by {@link createUiTextRenderable}. All entities sharing the same font/atlas
 * reference the same `Renderable` instance to maximise batching.
 */
export interface UiTextEcsComponent {
  /** The string to display. Use `\n` for explicit line breaks. */
  text: string;

  /**
   * The loaded font asset. Must be the atlas/metrics pair matching the desired
   * style (regular, bold, italic, or bold-italic — each is a separate asset).
   */
  font: FontAsset;

  /** Display font size in pixels. */
  fontSize: number;

  /** Text colour. Default white. */
  color: Color;

  /** Horizontal line alignment. Default `'left'`. */
  align: TextAlign;

  /** Vertical block alignment within the element rect. Default `'top'`. */
  verticalAlign: TextVerticalAlign;

  /** Line-wrapping mode. Default `'none'`. */
  wrap: TextWrap;

  /** Overflow handling. Default `'visible'`. */
  overflow: TextOverflow;

  /**
   * Global opacity multiplier (0–1). Multiplies with `color.a`.
   * Default `1`.
   */
  opacity: number;

  /**
   * Draw order within the UI canvas. Lower = further back. Keep coarse to
   * preserve batching. Default `0`.
   */
  zIndex: number;

  /** When `false` the text is excluded from rendering. Default `true`. */
  enabled: boolean;

  /**
   * The shared `Renderable<TextGlyphInstanceComponents>` for this font/atlas.
   * Created by {@link createUiTextRenderable} and shared across all text
   * entities that use the same font.
   */
  renderable: Renderable<TextGlyphInstanceComponents>;

  /**
   * Cached shaped-text output from the last {@link shapeText} call.
   * `undefined` forces a reshape on the next frame.
   * Written by the text system; do not set from user code.
   */
  shapedCache?: ShapedText;

  /**
   * When `true`, the text system will reshape the string before rendering.
   * Set to `true` whenever `text`, `font`, `fontSize`, or any layout option
   * changes.
   */
  dirty: boolean;
}

/** Component id for {@link UiTextEcsComponent}. */
export const uiTextId = createComponentId<UiTextEcsComponent>('ui-text');

/** Default values for {@link UiTextEcsComponent} style fields. */
export const defaultUiTextOptions: Omit<
  UiTextEcsComponent,
  'text' | 'font' | 'renderable' | 'shapedCache' | 'dirty'
> = {
  fontSize: 16,
  color: Color.white,
  align: 'left',
  verticalAlign: 'top',
  wrap: 'none',
  overflow: 'visible',
  opacity: 1,
  zIndex: 0,
  enabled: true,
};
