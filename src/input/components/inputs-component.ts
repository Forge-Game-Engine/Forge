import type { Component } from '../../ecs';
import { Vector2 } from '../../math';
import type { MouseButton } from '../constants';

/**
 * The `InputsComponent` tracks various input states such as key presses, mouse button
 * presses, and mouse coordinates.
 */
export class InputsComponent implements Component {
  public name: symbol;

  /**
   * The scroll delta value for the mouse wheel.
   */
  public scrollDelta: number = 0;

  /**
   * A set of currently pressed keys.
   */
  public keyPresses = new Set<string>();

  /**
   * A set of keys that are currently down.
   */
  public keyDowns = new Set<string>();

  /**
   * A set of keys that have been released.
   */
  public keyUps = new Set<string>();

  /**
   * A set of currently pressed mouse buttons.
   */
  public mouseButtonPresses = new Set<number>();

  /**
   * A set of mouse buttons that are currently down.
   */
  public mouseButtonDowns = new Set<number>();

  /**
   * A set of mouse buttons that have been released.
   */
  public mouseButtonUps = new Set<number>();

  /**
   * The current coordinates of the mouse cursor in screen space, where [x: 0, y: 0] is the top-left of the screen.
   */
  public localMouseCoordinates = new Vector2();

  /**
   * The current coordinates of the mouse cursor in world space, where [x: 0, y: 0] is the center of the world.
   */
  public worldMouseCoordinates = new Vector2();

  public static readonly symbol = Symbol('Inputs');

  constructor() {
    this.name = InputsComponent.symbol;
  }

  /**
   * Checks if a key is currently pressed.
   * @param code - The key code to check.
   * @returns True if the key is pressed, false otherwise.
   */
  public keyPressed(code: string) {
    return this.keyPresses.has(code);
  }

  /**
   * Checks if a key is currently down.
   * @param code - The key code to check.
   * @returns True if the key is down, false otherwise.
   */
  public keyPressedDown(code: string) {
    return this.keyDowns.has(code);
  }

  /**
   * Checks if a key has been released.
   * @param code - The key code to check.
   * @returns True if the key is released, false otherwise.
   */
  public keyPressedUp(code: string) {
    return this.keyUps.has(code);
  }

  /**
   * Checks if a mouse button is currently down.
   * @param button - The mouse button to check.
   * @returns True if the mouse button is down, false otherwise.
   */
  public isMouseButtonDown(button: MouseButton) {
    return this.mouseButtonDowns.has(button);
  }

  /**
   * Checks if a mouse button has been released.
   * @param button - The mouse button to check.
   * @returns True if the mouse button is released, false otherwise.
   */
  public isMouseButtonUp(button: MouseButton) {
    return this.mouseButtonUps.has(button);
  }

  /**
   * Checks if a mouse button is currently pressed.
   * @param button - The mouse button to check.
   * @returns True if the mouse button is pressed, false otherwise.
   */
  public isMouseButtonPressed(button: MouseButton) {
    return this.mouseButtonPresses.has(button);
  }
}
