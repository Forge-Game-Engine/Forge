import { Vector2 } from 'forge/math';

/**
 * The `RenderLayer` class represents a rendering layer with its own canvas and WebGL context.
 */
export abstract class RenderLayer {
  /** The name of the render layer. */
  public name: string;

  /** The canvas element associated with the render layer. */
  public canvas: HTMLCanvasElement;

  /** The center of the canvas. */
  public center: Vector2;

  /**
   * Constructs a new instance of the `RenderLayer` class.
   * @param name - The name of the render layer.
   * @param canvas - The canvas element associated with the render layer.
   */
  constructor(name: string, canvas: HTMLCanvasElement) {
    this.name = name;
    this.canvas = canvas;
    this.center = new Vector2(canvas.width / 2, canvas.height / 2);
  }

  /**
   * Resizes the canvas to the specified width and height, and updates the center.
   * @param width - The new width of the canvas.
   * @param height - The new height of the canvas.
   */
  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    this.canvas.style.width = `${this.canvas.width}px`;
    this.canvas.style.height = `${this.canvas.height}px`;

    this.center = new Vector2(this.canvas.width / 2, this.canvas.height / 2);
  }
}
