import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  AppliedTorqueEcsComponent,
  AppliedTorqueId,
} from '@forge-game-engine/forge/physics';
import { ThrusterEcsComponent, thrusterId } from './_thruster.component';

/**
 * Sets each matched entity's `AppliedTorqueEcsComponent.value` from its
 * `ThrusterEcsComponent` every tick: `torque` while `holdAction.isHeld`, `0`
 * otherwise. Must run before `createAppliedTorqueEcsSystem` in the same
 * tick so the value it sets is the one applied that tick, rather than the
 * previous tick's leftover `0`.
 */
export const createThrusterEcsSystem = (): EcsSystem<
  [ThrusterEcsComponent, AppliedTorqueEcsComponent]
> => ({
  query: [thrusterId, AppliedTorqueId],
  run: (result) => {
    const [thrusterComponent, appliedTorqueComponent] = result.components;

    appliedTorqueComponent.value = thrusterComponent.holdAction.isHeld
      ? thrusterComponent.torque
      : 0;
  },
});
