import { Component } from '@forge-game-engine/forge/ecs';

export class BulletComponent extends Component {
  public speed: number;

  constructor(speed: number) {
    super();
    this.speed = speed;
  }
}
