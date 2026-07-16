import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { RigidBody } from '@forge-game-engine/forge/physics';
import { Vector2 } from '@forge-game-engine/forge/math';

/**
 * The world-space height the chassis must fall below before the whole
 * vehicle is reset. The course only climbs from its start (never dips
 * below it), so a fixed threshold comfortably under spawn height is safe
 * for the whole drive. Kept tight: catching a bad transient within its
 * first steps, before it compounds into something more visibly broken,
 * matters far more here than tolerating a large legitimate drop.
 */
const fallThreshold = -120;

/**
 * How far the chassis may tilt from level before the whole vehicle is
 * reset. A vehicle built from joints rather than a single rigid frame can,
 * on rare unlucky frames, settle into a steeply tilted but otherwise
 * stable pose that never trips the fall check above; this catches that
 * failure mode too, tight enough to catch it before it reads as "tipped
 * over" rather than "climbing a slope".
 */
const maxTiltAngle = 0.35;

interface RecoverableBody {
  body: RigidBody;
  spawnPosition: Vector2;
  spawnAngle: number;
}

/**
 * Creates an ECS system that snaps `bodies` back to their spawn transform,
 * at rest, if `chassis` falls below `fallThreshold` or tilts beyond
 * `maxTiltAngle`. A vehicle built from joints and collision against many
 * small terrain segments can, on rare unlucky frames, end up in a broken
 * pose (falling through the ground, or settling at a steep, stuck tilt);
 * resetting is far simpler (and less disruptive to a player) than
 * eliminating every possible cause of that at the physics level.
 * @param bodies - The vehicle's bodies (chassis and wheels), captured at
 * their spawn position and angle.
 * @param chassis - The vehicle's chassis, checked against `fallThreshold`
 * and `maxTiltAngle`.
 */
export const createFallRecoveryEcsSystem = (
  bodies: readonly RecoverableBody[],
  chassis: RigidBody,
): EcsSystem<[]> => ({
  query: [],
  run: () => undefined,
  beforeQuery: () => {
    const isBroken =
      chassis.position.y < fallThreshold ||
      Math.abs(chassis.angle) > maxTiltAngle;

    if (!isBroken) {
      return null;
    }

    for (const { body, spawnPosition, spawnAngle } of bodies) {
      body.position = spawnPosition.clone();
      body.angle = spawnAngle;
      body.velocity = Vector2.zero;
      body.angularVelocity = 0;
    }

    return null;
  },
});
