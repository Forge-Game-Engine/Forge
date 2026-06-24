import { createComponentId } from '@forge-game-engine/forge/ecs';

export interface PaddleEcsComponent {
  speed: number;
  minX: number;
  maxX: number;
}

export const paddleId = createComponentId<PaddleEcsComponent>('Paddle');
