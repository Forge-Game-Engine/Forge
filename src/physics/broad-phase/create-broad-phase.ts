import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  addBroadPhaseComponent,
  BroadPhaseEcsComponent,
  broadPhaseId,
} from '../components/broad-phase-component.js';

/**
 * Creates the world's broad-phase entity, holding an empty
 * {@link BroadPhaseEcsComponent} that `createBroadPhaseEcsSystem` keeps
 * up to date. Call it once per world, before the first `world.update()`.
 * @param world - The ECS world to create the entity in.
 * @returns The created entity.
 * @throws An error if the world already has a broad-phase entity.
 */
export function createBroadPhase(world: EcsWorld): number {
  if (world.query([broadPhaseId]).entities.length > 0) {
    throw new Error(
      'createBroadPhase: the world already has a broad phase. Call createBroadPhase once per world.',
    );
  }

  const entity = world.createEntity();

  addBroadPhaseComponent(world, entity);

  return entity;
}

/**
 * Finds the world's {@link BroadPhaseEcsComponent}.
 * @param world - The ECS world to search.
 * @returns The world's broad-phase component.
 * @throws An error if the world has no broad-phase entity, or more than one.
 */
export function findBroadPhase(world: EcsWorld): BroadPhaseEcsComponent {
  const {
    components: [broadPhases],
  } = world.query<[BroadPhaseEcsComponent]>([broadPhaseId]);

  if (broadPhases.length === 0) {
    throw new Error(
      'The world has no broad phase. Call createBroadPhase(world) once before the first update.',
    );
  }

  if (broadPhases.length > 1) {
    throw new Error(
      `The world has ${broadPhases.length} broad phases, but must have one. Call createBroadPhase(world) once per world.`,
    );
  }

  return broadPhases[0];
}
