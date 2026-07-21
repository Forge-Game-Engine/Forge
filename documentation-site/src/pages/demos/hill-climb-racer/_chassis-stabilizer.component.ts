import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { RigidBody } from '@forge-game-engine/forge/physics';
import { GroundContactEcsComponent } from './_ground-contact.component';

/**
 * Applies a restoring torque pulling `body`'s `angle` back towards zero
 * (`-angle * levelingStiffness`) and resisting its `angularVelocity`
 * (`-angularVelocity * levelingDamping`), via `RigidBody.applyTorque`.
 * `createChassisStabilizerEcsSystem` applies this only while
 * `frontWheelGroundContact` or `rearWheelGroundContact` reports its wheel
 * touching the ground - never while airborne, so it doesn't fight
 * `AirControlEcsComponent`'s deliberate tilt input.
 *
 * `frontWheelGroundContact`/`rearWheelGroundContact` are each the same
 * `GroundContactEcsComponent` object attached to that wheel's own entity
 * (see `createWheel`) - held here by direct reference rather than joined
 * via an ECS query, since this component lives on the chassis's entity, not
 * either wheel's.
 *
 * A real car's suspension keeps the chassis roughly level through its
 * control-arm geometry, not just spring force; the chassis here hangs from
 * only two independently-solved `LinearSpring`/`LinearDamper` pairs (see
 * `createCar`), which has no equivalent geometric constraint and lets small
 * disturbances (an uneven landing, a bump straddling two ground segments)
 * accumulate into a persistent tilt over time rather than settling back to
 * level. This is deliberately much weaker than the pitch torque a hard
 * acceleration or brake produces, so the car still visibly leans under
 * throttle - it only pulls the chassis back level once nothing else is
 * actively tipping it.
 */
export interface ChassisStabilizerEcsComponent {
  body: RigidBody;
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
