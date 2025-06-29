import { RenderLayer } from './render-layer';

/**
 * The `ForgeRenderLayer` class represents a rendering layer with its own canvas and WebGL context.
 */
export class HtmlForgeRenderLayer extends RenderLayer {
  /** The 2D rendering context associated with this render layer. */
  public context: CanvasRenderingContext2D;

  /** Whether to sort entities by their y position before rendering. */
  public sortEntities: boolean;

  /**
   * Constructs a new instance of the `ForgeRenderLayer` class.
   * @param name - The name of the render layer.
   * @param canvas - The canvas element associated with the render layer.
   * @param sortEntities - Whether to sort entities by their y position before rendering (default: false).
   * @throws An error if the WebGL2 context is not found.
   */
  constructor(name: string, canvas: HTMLCanvasElement, sortEntities = false) {
    super(name, canvas);

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Context not found');
    }

    this.context = context;
    this.sortEntities = sortEntities;
  }

  public override resize(width: number, height: number): void {
    super.resize(width, height);
  }
}
