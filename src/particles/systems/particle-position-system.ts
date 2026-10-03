import { parentId } from '../../common/components/parent-component.js';
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
import { EcsWorld } from '../../ecs/ecs-world.js';
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

function writeWorldTransformIfRoot(
  world: EcsWorld,
  entity: number,
  position: PositionEcsComponent,
  rotation: RotationEcsComponent,
): void {
  // A parented particle's world transform depends on its parent's, which
  // only the transform system knows how to combine.
  if (world.getComponent(entity, parentId)) {
    return;
  }

  position.world.x = position.local.x;
  position.world.y = position.local.y;
  rotation.world = rotation.local;
}

/**
 * Creates an ECS system that moves and spins every particle: it applies each
 * particle's acceleration and drag to its velocity, moves it by that velocity
 * (plus its velocity offset, if any), and turns its rotation by its rotation
 * speed.
 *
 * For a particle with no `ParentEcsComponent`, the system writes the world
 * position and rotation as well as the local ones, so particles move on
 * screen without `createTransformEcsSystem`.
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
    world,
    {
      entities,
      components: [positionComponents, rotationComponents, particleComponents],
    },
  ) => {
    const { deltaTimeInSeconds } = time;

    for (let i = 0; i < entities.length; i++) {
      const position = positionComponents[i];
      const rotation = rotationComponents[i];
      const particle = particleComponents[i];

      moveParticle(particle, position, deltaTimeInSeconds);

      rotation.local += particle.rotationSpeed * deltaTimeInSeconds;

      writeWorldTransformIfRoot(world, entities[i], position, rotation);
    }
  },
});
