import type { Component } from '../../ecs';
import { InputManager } from '../input-manager';

/**
 * Component that provides access to the InputManager for an entity.
 */
export class InputsComponent implements Component {
  public readonly name: symbol;

  /** The InputManager instance. */
  public readonly inputManager: InputManager;

  public static readonly symbol = Symbol('Inputs');

  /** Creates a new InputsComponent.
   * @param inputManager - The InputManager instance to associate with this component.
   */
  constructor(inputManager: InputManager) {
    this.name = InputsComponent.symbol;

    this.inputManager = inputManager;
  }
}
