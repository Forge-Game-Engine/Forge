import { Color } from '../../rendering/color.js';
import { UiStateStyleConfig, UiStyleOverride } from './apply-ui-state-style.js';

/**
 * A theme object that defines the default visual language for the UI stack.
 *
 * Factories read their style defaults from a theme passed through widget
 * options. Per-widget overrides layer on top via {@link mergeUiStyle}.
 * Epic 8 will animate toward theme-defined target styles, making state
 * transitions theme-aware throughout.
 */
export interface UiTheme {
  /**
   * Default fill colour for panels, button backgrounds, and other containers.
   */
  backgroundColor: Color;

  /**
   * Primary interactive element colour (e.g. button tint in the resting state).
   */
  primaryColor: Color;

  /** Text and foreground colour used for labels and icons. */
  foregroundColor: Color;

  /** Fill colour applied to disabled elements. */
  disabledColor: Color;

  /** Default border colour. */
  borderColor: Color;

  /** Default border width in CSS pixels. */
  borderWidth: number;

  /** Default corner radius in CSS pixels applied to all four corners. */
  cornerRadius: number;

  /** Default font size in pixels used for widget labels. */
  fontSize: number;

  /**
   * Default per-state style overrides applied to interactive elements.
   * Individual widgets can merge their own overrides on top with
   * {@link mergeUiStyle}.
   */
  stateStyles: UiStateStyleConfig;
}

/**
 * The built-in default theme.
 *
 * Provides a neutral white-on-dark palette with subtle state feedback:
 * - Hover tints the element slightly grey.
 * - Press darkens further.
 * - Focus adds a blue border to indicate keyboard focus.
 * - Disabled renders in a muted grey with reduced opacity.
 */
export const defaultUiTheme: UiTheme = {
  backgroundColor: Color.white,
  primaryColor: new Color(0.2, 0.5, 1.0),
  foregroundColor: new Color(0.1, 0.1, 0.1),
  disabledColor: new Color(0.7, 0.7, 0.7),
  borderColor: Color.transparent,
  borderWidth: 0,
  cornerRadius: 4,
  fontSize: 16,
  stateStyles: {
    hover: {
      tintColor: new Color(0.9, 0.9, 0.9),
    },
    pressed: {
      tintColor: new Color(0.75, 0.75, 0.75),
    },
    focused: {
      borderColor: new Color(0.2, 0.5, 1.0),
      borderWidth: 2,
    },
    disabled: {
      tintColor: new Color(0.7, 0.7, 0.7),
      opacity: 0.6,
    },
  },
};

/**
 * Merges per-widget style overrides on top of a base {@link UiStyleOverride}.
 *
 * Follows the project-wide `{ ...defaults, ...options }` convention: all fields
 * present in `overrides` replace the corresponding `base` fields; absent fields
 * fall through to `base`.
 *
 * Typical usage — layering widget options over a theme:
 * ```ts
 * const baseStyle: UiStyleOverride = {
 *   tintColor: theme.backgroundColor,
 *   borderColor: theme.borderColor,
 *   borderWidth: theme.borderWidth,
 *   cornerRadius: theme.cornerRadius,
 * };
 * const resolved = mergeUiStyle(baseStyle, options.style);
 * ```
 *
 * @param base - The starting style (e.g. derived from a {@link UiTheme}).
 * @param overrides - Optional per-widget overrides. When `undefined` the
 *   returned value is a shallow copy of `base`.
 * @returns A new {@link UiStyleOverride} with `overrides` layered on `base`.
 */
export function mergeUiStyle(
  base: UiStyleOverride,
  overrides?: UiStyleOverride,
): UiStyleOverride {
  return { ...base, ...overrides };
}

/**
 * Converts a {@link UiTheme} into a {@link UiStyleOverride} containing the
 * theme's base visual properties.
 *
 * Useful as the `base` argument to {@link mergeUiStyle} so widget factories
 * can inherit theme defaults without duplicating the mapping.
 *
 * @param theme - The theme to extract base style from.
 * @returns A {@link UiStyleOverride} with `tintColor`, `borderColor`,
 *   `borderWidth`, and `cornerRadius` drawn from the theme.
 */
export function uiThemeToBaseStyle(theme: UiTheme): UiStyleOverride {
  return {
    tintColor: theme.backgroundColor,
    borderColor: theme.borderColor,
    borderWidth: theme.borderWidth,
    cornerRadius: theme.cornerRadius,
    opacity: 1,
  };
}
