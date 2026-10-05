import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { parentId } from '../../ecs/parent-component.js';
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
 * A moving body must be a root entity. Its velocity is in world space, so
 * adding it to the local position of a body with a `ParentEcsComponent`
 * would be wrong as soon as the parent rotated, scaled or moved. Connect
 * bodies with joints and springs instead.
 * @param time - The time instance used to scale velocity by the frame's
 * duration.
 * @throws An error if a `'dynamic'` or `'kinematic'` body has a
 * `ParentEcsComponent`.
 */
export const createEulerIntegrationEcsSystem = (
  time: Time,
): EcsSystem<
  [PositionEcsComponent, RotationEcsComponent, RigidBodyEcsComponent]
> => ({
  query: [positionId, rotationId, rigidBodyId],
  update: (
    world,
    { entities, components: [positions, rotations, rigidBodies] },
  ) => {
    for (let i = 0; i < positions.length; i++) {
      const rigidBodyComponent = rigidBodies[i];

      if (rigidBodyComponent.type === 'static') {
        continue;
      }

      if (world.getComponent(entities[i], parentId)) {
        throw new Error(
          `Rigid body entity "${entities[i]}" has a ParentEcsComponent. A ${rigidBodyComponent.type} body must be a root entity, since its velocity is in world space. Connect bodies with joints or springs instead.`,
        );
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
