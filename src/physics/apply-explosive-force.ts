import { PositionEcsComponent, positionId } from '../common/index.js';
import { EcsWorld } from '../ecs/index.js';
import {
  Vector2,
  vector2Clone,
  vector2Divide,
  vector2Magnitude,
  vector2Multiply,
  vector2Subtract,
  vector2Up,
} from '../math/index.js';
import { applyImpulse } from './apply-impluse.js';
import { RigidBodyEcsComponent, rigidBodyId } from './components/index.js';

/**
 * Applies a radial impulse to every dynamic body within `radius` of
 * `center`, strongest at `center` and falling off linearly to zero at
 * `radius`. The impulse passes through each body's center of mass, so it
 * never imparts spin. Bodies with no `RigidBodyEcsComponent` (static
 * geometry) and bodies at or beyond `radius` are untouched.
 * @param world - The ECS world to search for dynamic bodies in.
 * @param center - The explosion's world-space origin.
 * @param force - The impulse magnitude at `center`.
 * @param radius - The distance beyond which bodies are unaffected.
 */
export function applyExplosiveForce(
  world: EcsWorld,
  center: Vector2,
  force: number,
  radius: number,
): void {
  const { entities, components } = world.query<
    [PositionEcsComponent, RigidBodyEcsComponent]
  >([positionId, rigidBodyId]);
  const [positions, rigidBodies] = components;

  for (let i = 0; i < entities.length; i++) {
    const position = positions[i].world;
    const rigidBody = rigidBodies[i];

    // Clone before subtracting: `position` is the entity's live world
    // position, so this must not mutate it.
    const offset = vector2Subtract(vector2Clone(position), center);
    const distance = vector2Magnitude(offset);

    if (distance >= radius) {
      continue;
    }

    const direction =
      distance === 0 ? vector2Up() : vector2Divide(offset, distance);
    const magnitude = force * (1 - distance / radius);

    applyImpulse(
      vector2Multiply(direction, magnitude),
      position,
      position,
      rigidBody,
    );
  }
}
