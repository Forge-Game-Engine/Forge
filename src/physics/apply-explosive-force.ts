import { PositionEcsComponent, positionId } from '../common/index.js';
import { EcsWorld } from '../ecs/index.js';
import { Vector2 } from '../math/index.js';
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

    const offset = position.subtract(center);
    const distance = offset.magnitude();

    if (distance >= radius) {
      continue;
    }

    const direction = distance === 0 ? Vector2.up : offset.divide(distance);
    const magnitude = force * (1 - distance / radius);

    applyImpulse(direction.multiply(magnitude), position, position, rigidBody);
  }
}
