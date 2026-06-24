import { createComponentId } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';

export interface BallEcsComponent {
  speed: number;
  startPosition: Vector2;
}

export const ballId = createComponentId<BallEcsComponent>('Ball');
