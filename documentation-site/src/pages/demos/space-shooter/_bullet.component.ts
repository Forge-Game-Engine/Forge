import { createComponentId } from '@forge-game-engine/forge/ecs';

export interface BulletEcsComponent {
  speed: number;
}

export const bulletId = createComponentId<BulletEcsComponent>('Bullet');
