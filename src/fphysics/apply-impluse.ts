import { Vector2 } from '../math';
import { RigidBodyEcsComponent } from './components';

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
