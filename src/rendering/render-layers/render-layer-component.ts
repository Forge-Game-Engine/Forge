import { Component } from '../../ecs/index.js';
import { RenderLayer } from './render-layer.js';

/**
 * The `ForgeRenderLayer` class represents a rendering layer with its own canvas and WebGL context.
 */
export class RenderLayerComponent extends Component {
  /** The render layer associated with this component. */
  public renderLayer: RenderLayer;

  /** The order of the render layer (lower numbers are rendered first). */
  public order: number;

  /**
   * Constructs a new instance of the `RenderLayerComponent` class.
   * @param renderLayer - The render layer associated with this component.
   * @param order - The order of the render layer (lower numbers are rendered first).
   * @throws An error if the WebGL2 context is not found.
   */
  constructor(renderLayer: RenderLayer, order: number = 0) {
    super();

    this.renderLayer = renderLayer;
    this.order = order;
  }
}

export const RenderLayerComponentName = Symbol('RenderLayerComponent');

export interface RenderLayerEcsComponent {
  renderLayer: RenderLayer;
  order: number;
}
