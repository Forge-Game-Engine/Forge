import { createComponentId } from '../../ecs/ecs-component.js';
import { Color } from '../../rendering/color.js';
import { Renderable } from '../../rendering/renderable.js';
import type { UiInstanceComponents } from './ui-instance-components.js';

/**
 * Attaches rendering data to a UI entity.
 *
 * The `renderable` field points at a `Renderable<UiInstanceComponents>` built
 * by {@link createUiRenderable} (default shader) or
 * {@link createCustomUiRenderable} (custom shader).  All style fields are
 * per-instance: they are packed into the instance buffer every frame by
 * `bindInstanceData` and do not require a material swap.
 */
export interface UiRenderableEcsComponent {
  /** The renderable that drives this element's draw call. */
  renderable: Renderable<UiInstanceComponents>;

  /** When `false` the element is excluded from rendering. Default `true`. */
  enabled: boolean;

  /** Fill colour (RGBA, 0–1). Default white. */
  tintColor: Color;

  /** Border colour (RGBA, 0–1). Default transparent. */
  borderColor: Color;

  /**
   * Border width in screen-space pixels.
   * `0` disables the border entirely. Default `0`.
   */
  borderWidth: number;

  /**
   * Corner radius in screen-space pixels applied to all four corners.
   * Clamped to half the shortest side. Default `0`.
   */
  cornerRadius: number;

  /**
   * Global opacity multiplier (0–1).  Multiplies the tint's alpha.
   * Default `1`.
   */
  opacity: number;

  /**
   * Draw order within the UI canvas.  Lower values are rendered first
   * (further back). Keep coarse (per panel/window) to preserve batching.
   * Default `0`.
   */
  zIndex: number;
}

/** Component id for {@link UiRenderableEcsComponent}. */
export const uiRenderableId =
  createComponentId<UiRenderableEcsComponent>('ui-renderable');

/** Default style values for {@link UiRenderableEcsComponent}. */
export const defaultUiStyleOptions: Omit<
  UiRenderableEcsComponent,
  'renderable'
> = {
  enabled: true,
  tintColor: Color.white,
  borderColor: Color.transparent,
  borderWidth: 0,
  cornerRadius: 0,
  opacity: 1,
  zIndex: 0,
};
