import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { RigidBody } from '@forge-game-engine/forge/physics';
import { TriggerAction } from '@forge-game-engine/forge/input';

/**
 * One body's recorded spawn transform, teleported back to on restart.
 */
export interface CarResetBody {
  body: RigidBody;
  initialPosition: Vector2;
  initialAngle: number;
}

/**
 * Teleports every one of `bodies` back to its recorded spawn position,
 * angle, and zero velocity whenever `restartInput` fires, undoing however
 * far the car has driven, flipped, or tumbled down a hill.
 * `createCarResetEcsSystem` applies this every tick.
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
