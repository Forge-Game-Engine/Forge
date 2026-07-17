import type { Joint } from './joint.js';
import { PrismaticJoint } from './prismatic-joint.js';
import { resolvePrismaticJoint } from './resolve-prismatic-joint.js';
import { resolveRevoluteJoint } from './resolve-revolute-joint.js';

/**
 * Resolves `joint`, dispatching to the resolver for its concrete joint type.
 * @param joint - The joint to resolve.
 */
export function resolveJoint(joint: Joint): void {
  if (joint instanceof PrismaticJoint) {
    resolvePrismaticJoint(joint);

    return;
  }

  resolveRevoluteJoint(joint);
}
