import { Component } from '@forge-game-engine/forge/ecs';

export class PlayerComponent extends Component {
  public readonly speed: number;
  public readonly minX: number;
  public readonly maxX: number;
  public readonly minY: number;
  public readonly maxY: number;

  constructor(
    speed: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
  ) {
    super();

    this.speed = speed;
    this.minX = minX;
    this.maxX = maxX;
    this.minY = minY;
    this.maxY = maxY;
  }
}
