import { Component } from '@forge-game-engine/forge/ecs';
import { RenderLayer, Sprite } from '@forge-game-engine/forge/rendering';

export class GunComponent extends Component {
  public timeBetweenShots: number;
  public nextAllowedShotTime: number;
  public readonly bulletSprite: Sprite;
  public readonly renderLayer: RenderLayer;

  constructor(
    timeBetweenShots: number,
    bulletSprite: Sprite,
    renderLayer: RenderLayer,
  ) {
    super();
    this.timeBetweenShots = timeBetweenShots;
    this.nextAllowedShotTime = 0;
    this.bulletSprite = bulletSprite;
    this.renderLayer = renderLayer;
  }
}
