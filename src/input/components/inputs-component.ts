import type { Component } from '../../ecs';
import { InputGroup } from '../input-group';

export class InputsComponent implements Component {
  public readonly name: symbol;
  public readonly inputGroup: InputGroup;

  public static readonly symbol = Symbol('Inputs');

  constructor(inputGroup: InputGroup) {
    this.name = InputsComponent.symbol;
    this.inputGroup = inputGroup;
  }
}
