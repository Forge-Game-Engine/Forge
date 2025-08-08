import type { Component } from '../../ecs';

export class SpeedComponent implements Component {
  public name: symbol;
  public speed: number;

  public static readonly symbol = Symbol('speed');

  constructor(speed: number) {
    this.name = SpeedComponent.symbol;
    this.speed = speed;
  }
}
