import { createComponentId } from '@forge-game-engine/forge/ecs';

export interface AsteroidEcsComponent {
  speed: number;
  rotationSpeed: number;
}

export const asteroidId = createComponentId<AsteroidEcsComponent>('Asteroid');
