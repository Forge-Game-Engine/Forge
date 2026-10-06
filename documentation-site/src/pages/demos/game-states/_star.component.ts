import { createComponentId } from '@forge-game-engine/forge/ecs';

/**
 * A falling star the player tries to catch.
 */
export interface StarEcsComponent {
  fallSpeed: number;
}

export const starId = createComponentId<StarEcsComponent>('star');
