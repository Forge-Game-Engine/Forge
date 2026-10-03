import {
  PositionEcsComponent,
  positionId,
} from '../../common/components/position-component.js';
import {
  RotationEcsComponent,
  rotationId,
} from '../../common/components/rotation-component.js';
import { Time } from '../../common/time/Time.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  ParticleEcsComponent,
  ParticleId,
} from '../components/particle-component.js';

function moveParticle(
  particle: ParticleEcsComponent,
  position: PositionEcsComponent,
  deltaTimeInSeconds: number,
): void {
  const { velocity, acceleration, drag, getVelocityOffset } = particle;

  velocity.x += acceleration.x * deltaTimeInSeconds;
  velocity.y += acceleration.y * deltaTimeInSeconds;

  if (drag < 1) {
    const kept = Math.pow(drag, deltaTimeInSeconds);

    velocity.x *= kept;
    velocity.y *= kept;
  }

  position.local.x += velocity.x * deltaTimeInSeconds;
  position.local.y += velocity.y * deltaTimeInSeconds;

  if (getVelocityOffset) {
    const offset = getVelocityOffset();

    position.local.x += offset.x * deltaTimeInSeconds;
    position.local.y += offset.y * deltaTimeInSeconds;
  }
}

/**
 * Creates an ECS system that moves and spins every particle: it applies each
 * particle's acceleration and drag to its velocity, moves it by that velocity
 * (plus its velocity offset, if any), and turns its rotation by its rotation
 * speed.
 *
 * It writes each particle's local position and rotation;
 * `createTransformEcsSystem` turns them into the world transform.
 * @param time - The time instance used to determine how far to move and rotate particles each frame.
 * @returns The particle position ECS system.
 */
export const createParticlePositionEcsSystem = (
  time: Time,
): EcsSystem<
  [PositionEcsComponent, RotationEcsComponent, ParticleEcsComponent]
> => ({
  query: [positionId, rotationId, ParticleId],
  update: (
    _world,
    {
      components: [positionComponents, rotationComponents, particleComponents],
    },
  ) => {
    const { deltaTimeInSeconds } = time;

    for (let i = 0; i < positionComponents.length; i++) {
      const position = positionComponents[i];
      const rotation = rotationComponents[i];
      const particle = particleComponents[i];

      moveParticle(particle, position, deltaTimeInSeconds);

      rotation.local += particle.rotationSpeed * deltaTimeInSeconds;
    }
  },
});
