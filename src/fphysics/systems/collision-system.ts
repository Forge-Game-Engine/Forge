import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';
import { CollisionPair } from '../types/collision-pair.js';

export const createBroadPhaseEcsSystem = (
  time: Time,
  collisionPairs: CollisionPair[],
): EcsSystem<
  [
    PositionEcsComponent,
    RotationEcsComponent,
    RigidBodyEcsComponent,
    ColliderEcsComponent,
  ]
> => ({
  query: [positionId, rotationId, rigidBodyId, colliderId],
  run: ({ components }) => {
    const [
      positionComponent,
      rotationComponent,
      rigidBodyComponent,
      colliderComponent,
    ] = components;

    rotationComponent.local +=
      rigidBodyComponent.angularVelocity * time.deltaTimeInSeconds;

    positionComponent.local = positionComponent.local.add(
      rigidBodyComponent.velocity.multiply(time.deltaTimeInSeconds),
    );
  },
  beforeQuery: (world) => {
    
  }
});
