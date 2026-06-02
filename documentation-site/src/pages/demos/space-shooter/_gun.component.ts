import { createComponentId } from '@forge-game-engine/forge/ecs';
import { Sprite } from '@forge-game-engine/forge/rendering';

export interface GunEcsComponent {
  timeBetweenShots: number;
  nextAllowedShotTime: number;
  bulletSprite: Sprite;
  renderLayer: number;
}

export const gunId = createComponentId<GunEcsComponent>('Gun');
