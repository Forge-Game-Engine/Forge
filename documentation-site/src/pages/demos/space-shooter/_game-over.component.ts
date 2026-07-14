import { createComponentId } from '@forge-game-engine/forge/ecs';

export interface GameOverEcsComponent {
  isGameOver: boolean;
  messageElement: HTMLElement;
}

export const gameOverId = createComponentId<GameOverEcsComponent>('GameOver');
