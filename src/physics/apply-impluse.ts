import { Vector2 } from '../math/index.js';
import { RigidBodyEcsComponent } from './components/index.js';

export function applyImpulse(
  impulse: Vector2,
  impulseWorldPosition: Vector2,
  entityPosition: Vector2,
  rigidBody: RigidBodyEcsComponent,
): void {
  const localPosition = impulseWorldPosition.subtract(entityPosition);
  const angularImpulse = localPosition.cross(impulse);

  rigidBody.velocity = rigidBody.velocity.add(
    impulse.multiply(1 / rigidBody.mass),
  );
  rigidBody.angularVelocity += angularImpulse / rigidBody.momentOfInertia;
}
