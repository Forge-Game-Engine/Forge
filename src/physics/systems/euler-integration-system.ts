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
 * driven directly by game code. If
 * `RigidBodyEcsComponent.continuousCollisionTranslationClamp` is set (by
 * `createContinuousCollisionEcsSystem`, which must run before this system),
 * that clamped translation is integrated instead of this tick's full
 * `velocity * deltaTime`, and the clamp is then reset to `null`.
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

      rotationComponent.world +=
        rigidBodyComponent.angularVelocity * time.deltaTimeInSeconds;

      const translation =
        rigidBodyComponent.continuousCollisionTranslationClamp ??
        // Clone before scaling: `rigidBodyComponent.velocity` is the body's
        // live velocity state, not a disposable value.
        Vec2.multiply(
          Vec2.clone(rigidBodyComponent.velocity),
          time.deltaTimeInSeconds,
        );

      Vec2.add(positionComponent.world, translation);
      rigidBodyComponent.continuousCollisionTranslationClamp = null;

      rigidBodyComponent.angularVelocity *=
        1 / (1 + rigidBodyComponent.angularDrag * time.deltaTimeInSeconds);
    }
  },
});
