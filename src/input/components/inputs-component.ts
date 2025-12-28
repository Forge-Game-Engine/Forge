import { Component } from '../../ecs/index.js';
import { InputManager } from '../input-manager.js';

/**
 * Component that provides access to the InputManager for an entity.
 */
export class InputsComponent extends Component {
  /** The InputManager instance. */
  public readonly inputManager: InputManager;

  /** Creates a new InputsComponent.
   * @param inputManager - The InputManager instance to associate with this component.
   */
  constructor(inputManager: InputManager) {
    super();

    this.inputManager = inputManager;
  }
}
