import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { Vec2 } from '../../math/index.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';

/**
 * Creates an ECS system to Euler integration of rigid body entities.
 * @returns An ECS system that updates position and rotation of a rigid body
 * based their respective velocity and angular velocity. `'static'` bodies
 * (see {@link RigidBodyType}) are skipped entirely - they never move and
 * are never integrated - while `'kinematic'` bodies are integrated the same
 * as `'dynamic'` ones, since a kinematic body's `velocity` is expected to be
 * driven directly by game code.
 *
 * Velocities are in world space and are integrated into the body's
 * `local` position and rotation, which `createTransformEcsSystem` turns
 * into `world`. Register the transform system before the physics systems,
 * which read `world`, so they see every entity's current pose, including
 * ones created or moved this tick. A body's integrated movement then
 * reaches `world` on the next tick's transform pass.
 *
 * Rigid bodies are expected to be root entities: for a body with a
 * `ParentEcsComponent`, a world-space velocity added to its local position
 * is only correct while the parent is unrotated and unscaled.
 */
export const createEulerIntegrationEcsSystem = (
  time: Time,
): EcsSystem<
  [PositionEcsComponent, RotationEcsComponent, RigidBodyEcsComponent]
> => ({
  query: [positionId, rotationId, rigidBodyId],
  update: (_world, { components: [positions, rotations, rigidBodies] }) => {
    for (let i = 0; i < positions.length; i++) {
      const rigidBodyComponent = rigidBodies[i];

      if (rigidBodyComponent.type === 'static') {
        continue;
      }

      const positionComponent = positions[i];
      const rotationComponent = rotations[i];

      rotationComponent.local +=
        rigidBodyComponent.angularVelocity * time.deltaTimeInSeconds;

      // Clone before scaling: `rigidBodyComponent.velocity` is the body's
      // live velocity state, not a disposable value.
      Vec2.add(
        positionComponent.local,
        Vec2.multiply(
          Vec2.clone(rigidBodyComponent.velocity),
          time.deltaTimeInSeconds,
        ),
      );

      rigidBodyComponent.angularVelocity *=
        1 / (1 + rigidBodyComponent.angularDrag * time.deltaTimeInSeconds);
    }
  },
});
