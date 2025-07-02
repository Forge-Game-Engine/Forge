import type { Component } from '../../ecs';
import { InputSource } from '../input-sources';
import { InputAction, InputAxis1d } from '../input-types';

export class InputsComponent implements Component {
  public readonly name: symbol;
  public readonly inputSources: Set<InputSource>;
  public readonly inputActions: Map<string, InputAction>;
  public readonly inputAxis1ds: Map<string, InputAxis1d>;

  public static readonly symbol = Symbol('Inputs');

  constructor() {
    this.name = InputsComponent.symbol;
    this.inputActions = new Map<string, InputAction>();
    this.inputAxis1ds = new Map<string, InputAxis1d>();
    this.inputSources = new Set<InputSource>();
  }
}
