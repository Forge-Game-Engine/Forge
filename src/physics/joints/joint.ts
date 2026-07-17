import type { PrismaticJoint } from './prismatic-joint.js';
import type { RevoluteJoint } from './revolute-joint.js';

/**
 * A constraint linking two {@link RigidBody} instances, currently either a
 * {@link PrismaticJoint} (locks to one linear degree of freedom) or a
 * {@link RevoluteJoint} (locks to one rotational degree of freedom).
 * Register with a {@link PhysicsWorld} via `addJoint` for it to be solved
 * every {@link PhysicsWorld.step}.
 */
export type Joint = PrismaticJoint | RevoluteJoint;
