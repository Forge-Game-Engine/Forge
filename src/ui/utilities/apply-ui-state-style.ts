import { Color } from '../../rendering/color.js';
import { UiRenderableEcsComponent } from '../components/ui-renderable-component.js';
import { UiStateEcsComponent } from '../components/ui-state-component.js';

/**
 * A partial set of visual style properties that can be applied to a
 * {@link UiRenderableEcsComponent}. All fields are optional so callers only
 * need to specify the properties they want to override.
 */
export interface UiStyleOverride {
  /** Fill colour (RGBA, 0–1). */
  tintColor?: Color;
  /** Border colour (RGBA, 0–1). */
  borderColor?: Color;
  /** Border width in screen-space pixels. */
  borderWidth?: number;
  /** Corner radius in screen-space pixels. */
  cornerRadius?: number;
  /** Global opacity multiplier (0–1). */
  opacity?: number;
}

/**
 * Per-state visual style configuration used by interactive widgets.
 *
 * Each entry is applied as a delta on top of the widget's base style.
 * Priority order (later entries override earlier ones):
 * base → `hover` → `focused` → `pressed` → `disabled`.
 */
export interface UiStateStyleConfig {
  /** Overrides applied while the pointer is over the element. */
  hover?: UiStyleOverride;
  /** Overrides applied while the primary button is held down on the element. */
  pressed?: UiStyleOverride;
  /** Overrides applied while the element holds keyboard focus. */
  focused?: UiStyleOverride;
  /** Overrides applied while the element is disabled. */
  disabled?: UiStyleOverride;
}

function applyOverride(
  renderable: UiRenderableEcsComponent,
  override: UiStyleOverride,
): void {
  if (override.tintColor !== undefined) {
    renderable.tintColor = override.tintColor;
  }

  if (override.borderColor !== undefined) {
    renderable.borderColor = override.borderColor;
  }

  if (override.borderWidth !== undefined) {
    renderable.borderWidth = override.borderWidth;
  }

  if (override.cornerRadius !== undefined) {
    renderable.cornerRadius = override.cornerRadius;
  }

  if (override.opacity !== undefined) {
    renderable.opacity = override.opacity;
  }
}

/**
 * Applies visual style overrides to `renderable` based on the current flags in
 * `state`, using `base` as the starting point.
 *
 * Always resets to `base` first, then layers active-state overrides from
 * `config` in priority order: `hover` → `focused` → `pressed` → `disabled`.
 * This ensures consistent appearance regardless of the transition history.
 *
 * Designed to be called from event listeners registered by widget factories;
 * in Epic 8 the overrides will be animated rather than snapped.
 *
 * @param renderable - The renderable to update.
 * @param state - The element's current interaction state.
 * @param base - The resting style applied before any state overrides.
 * @param config - Per-state style deltas.
 */
export function applyUiStateStyle(
  renderable: UiRenderableEcsComponent,
  state: UiStateEcsComponent,
  base: UiStyleOverride,
  config: UiStateStyleConfig,
): void {
  applyOverride(renderable, base);

  if (state.hovered) {
    if (config.hover) {
      applyOverride(renderable, config.hover);
    }
  }

  if (state.focused) {
    if (config.focused) {
      applyOverride(renderable, config.focused);
    }
  }

  if (state.pressed) {
    if (config.pressed) {
      applyOverride(renderable, config.pressed);
    }
  }

  if (state.disabled) {
    if (config.disabled) {
      applyOverride(renderable, config.disabled);
    }
  }
}
