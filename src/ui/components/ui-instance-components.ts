import type { UiRenderableEcsComponent } from './ui-renderable-component.js';
import type { UiTransformEcsComponent } from './ui-transform-component.js';

/**
 * The components resolved per UI entity by the UI render system and passed
 * to `bindInstanceData` on a `Renderable<UiInstanceComponents>`.
 */
export interface UiInstanceComponents {
  /** The element's transform (world matrix, resolved rect, clip rect). */
  transform: UiTransformEcsComponent;

  /** The element's render style (tint, border, opacity, etc.). */
  uiRenderable: UiRenderableEcsComponent;
}
