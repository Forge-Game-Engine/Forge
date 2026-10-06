import {
  PositionEcsComponent,
  positionId,
  rotationId,
} from '../common/index.js';
import { EcsWorld } from '../ecs/index.js';
import { Vec2, Vector2 } from '../math/index.js';
import { getColliderRotation } from './collider-rotation.js';
import { RigidBodyEcsComponent, rigidBodyId } from './components/index.js';
import { applyPointImpulse } from './joints/apply-point-impulse.js';
import {
  getRigidBodyMassData,
  getWorldCenterOfMass,
} from './rigid-body-mass-data.js';

/**
 * Applies a radial impulse to every dynamic body within `radius` of
 * `center`, strongest at `center` and falling off linearly to zero at
 * `radius`. Distance and direction are measured to each body's center of
 * mass, and the impulse passes through it, so it never imparts spin.
 * Bodies with no `RigidBodyEcsComponent`, `'static'`/`'kinematic'` bodies
 * (see {@link RigidBodyType}), and bodies whose center of mass is at or
 * beyond `radius` are untouched.
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
  const [positions] = components;

  for (let i = 0; i < entities.length; i++) {
    const massData = getRigidBodyMassData(world, entities[i]);

    if (massData.invMass === 0) {
      continue;
    }

    const centerOfMass = getWorldCenterOfMass(
      positions[i].world,
      getColliderRotation(world.getComponent(entities[i], rotationId)),
      massData.localCenterOfMass,
    );
    // `centerOfMass` is freshly allocated, so subtracting in place is safe.
    const offset = Vec2.subtract(centerOfMass, center);
    const distance = Vec2.magnitude(offset);

    if (distance >= radius) {
      continue;
    }

    const direction = distance === 0 ? Vec2.up : Vec2.divide(offset, distance);
    const magnitude = force * (1 - distance / radius);

    // Applied at the center of mass, so there's no lever arm.
    applyPointImpulse(
      massData.rigidBody,
      Vec2.zero,
      massData.invMass,
      massData.invInertia,
      Vec2.multiply(direction, magnitude),
    );
  }
}
