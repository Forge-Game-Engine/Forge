import { RenderLayer } from './render-layer';
import { CLEAR_STRATEGY, type CLEAR_STRATEGY_KEYS } from '../enums';

/**
 * The `ForgeRenderLayer` class represents a rendering layer with its own canvas and WebGL context.
 */
export class ForgeRenderLayer extends RenderLayer {
  /** The WebGL2 rendering context for the canvas. */
  public context: WebGL2RenderingContext;

  /** The strategy for clearing the render layer. */
  public clearStrategy: CLEAR_STRATEGY_KEYS;

  /** Whether to sort entities by their y position before rendering. */
  public sortEntities: boolean;

  /**
   * Constructs a new instance of the `ForgeRenderLayer` class.
   * @param name - The name of the render layer.
   * @param canvas - The canvas element associated with the render layer.
   * @param clearStrategy - The strategy for clearing the render layer (default: CLEAR_STRATEGY.blank).
   * @param sortEntities - Whether to sort entities by their y position before rendering (default: false).
   * @throws An error if the WebGL2 context is not found.
   */
  constructor(
    name: string,
    canvas: HTMLCanvasElement,
    clearStrategy: CLEAR_STRATEGY_KEYS = CLEAR_STRATEGY.blank,
    sortEntities = false,
  ) {
    super(name, canvas);

    const context = canvas.getContext('webgl2');

    if (!context) {
      throw new Error('Context not found');
    }

    this.context = context;
    this.clearStrategy = clearStrategy;
    this.sortEntities = sortEntities;

    this.context.viewport(0, 0, canvas.width, canvas.height);
  }

  public override resize(width: number, height: number): void {
    super.resize(width, height);

    this.context.viewport(0, 0, width, height);
  }
}
