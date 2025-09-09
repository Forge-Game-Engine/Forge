import type { Component } from '../../ecs';
import { InputManager } from '../input-manager';

export class InputsComponent implements Component {
  public readonly name: symbol;

  public readonly inputManager: InputManager;

  public static readonly symbol = Symbol('Inputs');

  constructor(inputManager: InputManager) {
    this.name = InputsComponent.symbol;

    this.inputManager = inputManager;
  }
}
