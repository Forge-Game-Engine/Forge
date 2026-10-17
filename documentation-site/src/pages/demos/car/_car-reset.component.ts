import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { TriggerAction } from '@forge-game-engine/forge/input';

/**
 * One entity's recorded spawn transform, teleported back to on restart.
 */
export interface CarResetBody {
  entity: number;
  initialPosition: Vector2;
  initialAngle: number;
}

/**
 * Moves every body in `bodies` back to its spawn point when
 * `restartInput` fires.
 */
export interface CarResetEcsComponent {
  restartInput: TriggerAction;
  bodies: CarResetBody[];
}

export const carResetId = createComponentId<CarResetEcsComponent>('carReset');

export function addCarResetComponent(
  world: EcsWorld,
  entity: number,
  options: CarResetEcsComponent,
): CarResetEcsComponent {
  return world.addComponent(entity, carResetId, { ...options });
}
