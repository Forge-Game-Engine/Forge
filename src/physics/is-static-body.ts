import { RigidBodyEcsComponent } from './components/rigidbody-component.js';

/**
 * Whether a collider entity is static: it has no rigid body, or a
 * `'static'` one. Static colliders never move on their own, so collision
 * resolution treats them as having infinite mass, the broad phase never
 * pairs two of them, and continuous collision sweeps moving circles against
 * them.
 * @param rigidBody - The entity's rigid body, or `null` if it has none.
 * @returns `true` if the collider is static.
 */
export function isStaticBody(rigidBody: RigidBodyEcsComponent | null): boolean {
  return rigidBody === null || rigidBody.type === 'static';
}
