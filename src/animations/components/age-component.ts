import type { Component } from '../../ecs';

export class AgeComponent implements Component {
  public name: symbol;
  public ageSeconds: number;
  public lifetimeSeconds: number;

  public static readonly symbol = Symbol('age');

  constructor(lifetimeSeconds: number) {
    this.name = AgeComponent.symbol;
    this.ageSeconds = 0;
    this.lifetimeSeconds = lifetimeSeconds;
  }
}
