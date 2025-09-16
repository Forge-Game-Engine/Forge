import { Component } from '../../src';

export class ControlAdventurerComponent implements Component {
  public name: symbol;

  public static readonly symbol = Symbol('ControlAdventurer');

  constructor() {
    this.name = ControlAdventurerComponent.symbol;
  }
}
