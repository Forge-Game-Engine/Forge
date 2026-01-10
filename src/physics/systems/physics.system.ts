import { Body, Engine } from 'matter-js';

import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  type Time,
} from '../../common/index.js';
import { PhysicsBodyEcsComponent, PhysicsBodyId } from '../components/index.js';

import { EcsSystem } from '../../new-ecs/ecs-system.js';

/**
 * Creates an ECS system to handle physics.
 */
export const createPhysicsEcsSystem = (
  engine: Engine,
  time: Time,
): EcsSystem<
  [PhysicsBodyEcsComponent, PositionEcsComponent, RotationEcsComponent]
> => ({
  query: [PhysicsBodyId, positionId, rotationId],
  beforeQuery: () => {
    Engine.update(engine, time.deltaTimeInMilliseconds);
  },
  run: (result) => {
    const [physicsBodyComponent, positionComponent, rotationComponent] =
      result.components;

    if (physicsBodyComponent.physicsBody.isStatic) {
      Body.setPosition(physicsBodyComponent.physicsBody, {
        x: positionComponent.world.x,
        y: positionComponent.world.y,
      });

      Body.setAngle(physicsBodyComponent.physicsBody, rotationComponent.world);
    } else {
      positionComponent.world.x = physicsBodyComponent.physicsBody.position.x;
      positionComponent.world.y = physicsBodyComponent.physicsBody.position.y;

      rotationComponent.world = physicsBodyComponent.physicsBody.angle;
    }
  },
});
