import { createComponentId } from '@forge-game-engine/forge/ecs';
import { SpriteEcsComponent } from '@forge-game-engine/forge/rendering';

export interface GunEcsComponent {
  timeBetweenShots: number;
  nextAllowedShotTime: number;
  bulletSprite: SpriteEcsComponent;
}

export const gunId = createComponentId<GunEcsComponent>('Gun');
