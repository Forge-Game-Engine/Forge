import type { Component } from '../../ecs';
import { InputAction } from '../input-types';

export class InputsComponent implements Component {
  public readonly name: symbol;
  public readonly inputActions: Map<string, InputAction>;

  public static readonly symbol = Symbol('Inputs');

  constructor() {
    this.name = InputsComponent.symbol;
    this.inputActions = new Map<string, InputAction>();
  }
}
