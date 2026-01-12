import { createComponentId } from '@forge-game-engine/forge/ecs';

export interface PlayerEcsComponent {
  speed: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const PlayerId = createComponentId<PlayerEcsComponent>('Player');
