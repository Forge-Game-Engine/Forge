import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { GroundContactEcsComponent } from './_ground-contact.component';

/**
 * Gently pulls the chassis back to level while a wheel is on the ground.
 * Two independent springs alone let small bumps add up into a lasting
 * tilt. It's much weaker than the lean from accelerating or braking, so
 * the car still leans.
 */
export interface ChassisStabilizerEcsComponent {
  chassisEntity: number;
  frontWheelGroundContact: GroundContactEcsComponent;
  rearWheelGroundContact: GroundContactEcsComponent;
  levelingStiffness: number;
  levelingDamping: number;
}

export const chassisStabilizerId =
  createComponentId<ChassisStabilizerEcsComponent>('chassisStabilizer');

export function addChassisStabilizerComponent(
  world: EcsWorld,
  entity: number,
  options: ChassisStabilizerEcsComponent,
): ChassisStabilizerEcsComponent {
  return world.addComponent(entity, chassisStabilizerId, { ...options });
}
