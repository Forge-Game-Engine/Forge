import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { PrismaticJoint } from '@forge-game-engine/forge/physics';

/**
 * Drives a jointed slider that would otherwise just sit at rest: since
 * PrismaticJoint has no built-in motor, this periodically applies an
 * impulse to the joint's `bodyB` instead, the same "scale an impulse and
 * apply it every so often" approach described in the Applying Forces guide.
 */
export interface PumpEcsComponent {
  joint: PrismaticJoint;
  impulse: Vector2;
  intervalSeconds: number;
  /**
   * When `true`, the impulse direction flips every trigger (a piston
   * pumping back and forth). When `false`, the same impulse is applied
   * every trigger and gravity (or the incline) is relied on to bring the
   * slider back (an elevator, or a ball climbing an incline).
   */
  alternate: boolean;
  elapsedSeconds: number;
  direction: 1 | -1;
}

export const pumpId = createComponentId<PumpEcsComponent>('pump');

export interface PumpOptions {
  joint: PrismaticJoint;
  impulse: Vector2;
  intervalSeconds: number;
  alternate: boolean;
}

export function addPumpComponent(
  world: EcsWorld,
  entity: number,
  options: PumpOptions,
): PumpEcsComponent {
  const component: PumpEcsComponent = {
    ...options,
    elapsedSeconds: 0,
    direction: 1,
  };

  return world.addComponent(entity, pumpId, component);
}
