import { createComponentId } from '../../new-ecs/ecs-component.js';

/**
 * ECS-style component interface for managing entity lifetime.
 */
export interface LifetimeEcsComponent {
  elapsedSeconds: number;
  durationSeconds: number;
  hasExpired: boolean;
}

export const lifetimeId = createComponentId<LifetimeEcsComponent>('lifetime');
