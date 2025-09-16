import type { Component } from '../../ecs';

/**
 * Component that tracks the age and lifetime of an entity.
 */
export class AgeComponent implements Component {
  public name: symbol;
  public ageSeconds: number;
  public lifetimeSeconds: number;
  public static readonly symbol = Symbol('Age');

  /**
   * Creates an instance of the AgeComponent.
   * @param lifetimeSeconds - The total lifetime duration of the entity in seconds.
   */
  constructor(lifetimeSeconds: number) {
    this.name = AgeComponent.symbol;
    this.ageSeconds = 0;
    this.lifetimeSeconds = lifetimeSeconds;
  }
}
