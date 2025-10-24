import type { Component } from '../../ecs/index.js';

/**
 * Component that tracks the elapsed time and duration of an entity's lifetime.
 * This is a pure data component with no logic.
 */
export class LifetimeComponent implements Component {
  public name: symbol;
  public elapsedSeconds: number;
  public durationSeconds: number;
  public hasExpired: boolean;
  public static readonly symbol = Symbol('Lifetime');

  /**
   * Creates an instance of the LifetimeComponent.
   * @param durationSeconds - The total duration of the entity's lifetime in seconds.
   */
  constructor(durationSeconds: number) {
    this.name = LifetimeComponent.symbol;
    this.elapsedSeconds = 0;
    this.durationSeconds = durationSeconds;
    this.hasExpired = false;
  }

  public reset(durationSeconds: number = this.durationSeconds): void {
    this.durationSeconds = durationSeconds;
    this.elapsedSeconds = 0;
    this.hasExpired = false;
  }
}
