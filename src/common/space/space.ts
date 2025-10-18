import { ForgeEvent } from 'forge/events';
import { Vector2 } from 'forge/math';

/**
 * Class to represent a 2D space with width, height, and center point.
 */
export class Space {
  /**
   * Event that is raised when the space changes.
   */
  public onSpaceChange: ForgeEvent;

  private _center: Vector2;
  private _width: number;
  private _height: number;

  /**
   * Creates an instance of Space.
   * @param width - The width of the space.
   * @param height - The height of the space.
   * @example
   * const space = new Space(800, 600);
   * console.log(space.width); // 800
   * console.log(space.height); // 600
   * console.log(space.center); // Vector2 { x: 400, y: 300 }
   */
  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;

    this._center = new Vector2(this._width / 2, this._height / 2);

    this.onSpaceChange = new ForgeEvent('space-change');
  }

  /**
   * Gets the center point of the space.
   * @returns The center point of the space.
   */
  get center(): Vector2 {
    return this._center;
  }

  /**
   * Gets the width of the space.
   * @returns The width of the space.
   */
  get width(): number {
    return this._width;
  }

  /**
   * Gets the height of the space.
   * @returns The height of the space.
   */
  get height(): number {
    return this._height;
  }

  /**
   * Sets the dimensions of the space.
   * @param height - The new height of the space.
   * @param width - The new width of the space.
   * @returns The updated Space instance.
   */
  public setValue(width: number, height: number): this {
    this._width = width;
    this._height = height;

    this._calculateCenter();

    this.onSpaceChange.raise();

    return this;
  }

  /**
   * Calculates the center point of the space based on its dimensions.
   */
  private _calculateCenter() {
    this._center = new Vector2(this._width / 2, this._height / 2);
  }
}
