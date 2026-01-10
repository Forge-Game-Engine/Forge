import { createComponentId } from '../../new-ecs/ecs-component.js';

/**
 * ECS-style component interface for age-based scaling.
 */
export interface AgeScaleEcsComponent {
  originalScaleX: number;
  originalScaleY: number;
  finalLifetimeScaleX: number;
  finalLifetimeScaleY: number;
}

export const ageScaleId = createComponentId<AgeScaleEcsComponent>('ageScale');
