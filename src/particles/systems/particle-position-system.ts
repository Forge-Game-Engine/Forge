import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  SpeedEcsComponent,
  speedId,
  Time,
} from '../../common/index.js';
import { ParticleEcsComponent, ParticleId } from '../index.js';

import { EcsSystem } from '../../new-ecs/ecs-system.js';

/**
 * Creates an ECS system to handle updating particle positions.
 */
export const createParticlePositionEcsSystem = (
  time: Time,
): EcsSystem<
  [
    PositionEcsComponent,
    RotationEcsComponent,
    SpeedEcsComponent,
    ParticleEcsComponent,
  ]
> => ({
  query: [positionId, rotationId, speedId, ParticleId],
  run: (result) => {
    const [
      positionComponent,
      rotationComponent,
      speedComponent,
      particleComponent,
    ] = result.components;

    positionComponent.local.x +=
      speedComponent.speed *
      time.deltaTimeInSeconds *
      Math.sin(rotationComponent.local);
    positionComponent.local.y -=
      speedComponent.speed *
      time.deltaTimeInSeconds *
      Math.cos(rotationComponent.local);

    rotationComponent.local +=
      particleComponent.rotationSpeed * time.deltaTimeInSeconds;
  },
});
