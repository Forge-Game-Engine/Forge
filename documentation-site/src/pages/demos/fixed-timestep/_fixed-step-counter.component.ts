import { Time } from '@forge-game-engine/forge/common';
import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';

/**
 * Counts the fixed steps the world ran in its latest frame. Both fields are
 * written only by the fixed step counter system, which runs once per fixed
 * step.
 */
export interface FixedStepCounterEcsComponent {
  /** The `time.frames` of the frame `steps` counts the fixed steps of. */
  frame: number;

  /** How many fixed steps ran in frame `frame`. */
  steps: number;
}

export const fixedStepCounterId =
  createComponentId<FixedStepCounterEcsComponent>('fixedStepCounter');

/**
 * Attaches a {@link FixedStepCounterEcsComponent} to `entity`, with no
 * steps counted yet.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the counter to.
 * @returns The attached component.
 */
export function addFixedStepCounterComponent(
  world: EcsWorld,
  entity: number,
): FixedStepCounterEcsComponent {
  return world.addComponent(entity, fixedStepCounterId, {
    frame: -1,
    steps: 0,
  });
}

/**
 * Reads how many fixed steps ran in the latest frame. A frame that ran no
 * fixed step left the counter on an earlier frame, so it counts `0`.
 * @param counter - The counter to read.
 * @param time - The time the world's fixed steps are taken from.
 * @returns The number of fixed steps the latest frame ran.
 */
export function getFixedStepsThisFrame(
  counter: FixedStepCounterEcsComponent,
  time: Time,
): number {
  return counter.frame === time.frames ? counter.steps : 0;
}
