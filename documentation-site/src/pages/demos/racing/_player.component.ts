import { createComponentId } from '@forge-game-engine/forge/ecs';

export interface PlayerEcsComponent {
  baseSpeed: number;
  speedRange: number;
  turnSpeed: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const PlayerId = createComponentId<PlayerEcsComponent>('Player');
