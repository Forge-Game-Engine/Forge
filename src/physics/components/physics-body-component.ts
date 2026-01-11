import type { Body } from 'matter-js';
import { createComponentId } from '../../new-ecs/ecs-component.js';

/**
 * ECS-style component interface for a physics body.
 */
export interface PhysicsBodyEcsComponent {
  physicsBody: Body;
}

export const PhysicsBodyId =
  createComponentId<PhysicsBodyEcsComponent>('PhysicsBody');
