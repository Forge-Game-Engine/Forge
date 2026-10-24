import { ComponentKey } from '../../ecs/ecs-component.js';
import { linearDamperId } from '../components/linear-damper-component.js';
import { linearSpringId } from '../components/linear-spring-component.js';
import { prismaticJointId } from '../components/prismatic-joint-component.js';
import { revoluteJointId } from '../components/revolute-joint-component.js';

/**
 * A component, on its own joint entity, that connects two bodies.
 */
export interface TwoBodyLink {
  readonly entityA: number;
  readonly entityB: number;
}

/**
 * The components that connect two bodies into one island for sleeping:
 * revolute and prismatic joints, linear springs and linear dampers. A new
 * component that connects two bodies belongs here too, or the bodies it
 * connects fall asleep apart and its system keeps pushing a sleeping body.
 */
export const islandLinkComponents: readonly ComponentKey<TwoBodyLink>[] = [
  revoluteJointId,
  prismaticJointId,
  linearSpringId,
  linearDamperId,
];
