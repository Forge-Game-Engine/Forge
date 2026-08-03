import {
  Vector2,
  vector2Add,
  vector2Clone,
  vector2Cross,
  vector2Multiply,
  vector2Subtract,
} from '../math/index.js';
import { RigidBodyEcsComponent } from './components/index.js';

export function applyImpulse(
  impulse: Vector2,
  impulseWorldPosition: Vector2,
  entityPosition: Vector2,
  rigidBody: RigidBodyEcsComponent,
): void {
  // Clone before subtracting/multiplying: callers may pass the same object
  // for `impulseWorldPosition`/`entityPosition` (or a live world position),
  // and may reuse `impulse` afterward, so none of these may be mutated.
  const localPosition = vector2Subtract(
    vector2Clone(impulseWorldPosition),
    entityPosition,
  );
  const angularImpulse = vector2Cross(localPosition, impulse);

  rigidBody.velocity = vector2Add(
    rigidBody.velocity,
    vector2Multiply(vector2Clone(impulse), 1 / rigidBody.mass),
  );
  rigidBody.angularVelocity += angularImpulse / rigidBody.momentOfInertia;
}
