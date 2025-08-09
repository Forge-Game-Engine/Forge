import type { Component } from '../../ecs';

/**
 * Component to track an entities speed.
 */
export class SpeedComponent implements Component {
  public name: symbol;
  public speed: number;

  public static readonly symbol = Symbol('Speed');

  /**
   * Creates an instance of SpeedComponent.
   * @param speed - the entities speed
   */
  constructor(speed: number) {
    this.name = SpeedComponent.symbol;
    this.speed = speed;
  }
}
