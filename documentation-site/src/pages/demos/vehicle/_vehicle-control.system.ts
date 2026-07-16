import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';
import {
  RigidBody,
  WheelMotorEcsComponent,
  WheelMotorId,
} from '@forge-game-engine/forge/physics';
import { clamp, Vector2 } from '@forge-game-engine/forge/math';

// Propulsion is a direct horizontal force on the chassis rather than torque
// applied through the wheels' friction contact with the ground. Driving
// through friction depends on the wheel actually gripping (which in turn
// depends on suspension compression, contact state, and slip at that
// instant), so its effectiveness varies run to run in a way that's
// unacceptable for a demo meant to always be drivable. A direct force is
// deterministic: the same input always produces the same acceleration.
const driveForce = 2_500_000;

// A virtual torsional damper holding the chassis level, like anti-roll bars
// on a real car. A single SpringJoint per wheel only constrains each
// wheel's distance from its chassis anchor, not the chassis's own
// orientation, so nothing otherwise resists the chassis rotating relative
// to the wheels; under load that let the chassis swing to a steep,
// unrecoverable tilt.
const levelingStiffness = 4_000_000;
const levelingDamping = 400_000;

// A direct positional correction pulling each wheel back toward where it
// belongs relative to the chassis: its anchor, offset downward by
// restLength, both rotated into world space. A single SpringJoint only
// constrains the *distance* between the wheel and its anchor, not the
// *direction*, so the wheel is otherwise free to swing like a pendulum
// (sideways) or catch a bad frame and end up far along its constrained
// distance in the wrong place entirely (vertically); over time that
// accumulates into a wheel ending up far from its intended position. This
// acts like the stiffness a real suspension arm provides in every
// direction but its intended travel, which a single point-to-point spring
// has no way to express on its own. Kept soft relative to the joint itself
// so the spring still visibly gives on bumps; this is a leash bounding
// where that give can wander, not a replacement for it.
const wheelPositionStiffness = 150_000;
const wheelPositionDamping = 15_000;

// The wheel motor still spins the wheels, but purely for visual feedback:
// its target tracks the chassis's own velocity (rolling without slipping)
// rather than an independent, input-driven speed, so the wheels always spin
// at the rate and direction that actually matches how fast and which way
// the car is moving, instead of a value disconnected from the vehicle's
// real motion. The torque behind it is low enough to only ever need to
// overcome a wheel's own (small) rotational inertia, never the vehicle's,
// so it can't destabilize the suspension.
const maxWheelAngularVelocity = 40;
const wheelSpinMaxTorque = 20_000;

const driveInputDeadzone = 0.05;

// Idle rolling resistance: with no drive input, nothing otherwise opposes
// the chassis's own horizontal momentum (the wheel positional correction
// above only reacts to velocity *relative* to the chassis, by design, so it
// does nothing to a chassis and wheels already translating together). Any
// residual velocity left over from settling onto the terrain would
// otherwise have the vehicle glide indefinitely at a constant speed. Small
// enough to be imperceptible against driveForce while actively driving.
const idleDragCoefficient = 8_000;

/**
 * A motorized wheel and the anchor offset (relative to the chassis's
 * center, in the chassis's unrotated local space) it should stay near,
 * `restLength` below.
 */
export interface ControlledWheel {
  wheel: RigidBody;
  anchorOffset: Vector2;
  restLength: number;
}

/**
 * Creates an ECS system that drives the vehicle: applies a direct
 * horizontal force to `chassis` for reliable propulsion, a torsional
 * correction keeping it level, a positional correction keeping each wheel
 * near its intended anchor, and spins each motorized wheel entity's
 * `WheelMotorEcsComponent` to visually match the chassis's actual velocity.
 * Must be registered with an earlier `SystemRegistrationOrder` than
 * `createPhysicsEcsSystem`, the same requirement `createWheelMotorEcsSystem`
 * has, since it feeds that system.
 * @param driveInput - The forward (positive) / reverse (negative) input
 * axis.
 * @param chassis - The vehicle's chassis body to apply drive force to, and
 * whose velocity the wheels' visual spin tracks.
 * @param wheelRadius - The radius of the vehicle's wheels, used to convert
 * the chassis's linear velocity into an angular one.
 * @param controlledWheels - Each motorized wheel and the anchor offset it
 * should stay near.
 */
export const createVehicleControlEcsSystem = (
  driveInput: Axis1dAction,
  chassis: RigidBody,
  wheelRadius: number,
  controlledWheels: readonly ControlledWheel[],
): EcsSystem<[WheelMotorEcsComponent]> => ({
  query: [WheelMotorId],
  beforeQuery: () => {
    if (Math.abs(driveInput.value) > driveInputDeadzone) {
      chassis.applyForce(new Vector2(driveInput.value * driveForce, 0));
    } else {
      chassis.applyForce(
        new Vector2(-chassis.velocity.x * idleDragCoefficient, 0),
      );
    }

    chassis.applyTorque(
      -chassis.angle * levelingStiffness -
        chassis.angularVelocity * levelingDamping,
    );

    for (const { wheel, anchorOffset, restLength } of controlledWheels) {
      const expectedPosition = chassis.position.add(
        new Vector2(anchorOffset.x, -restLength).rotate(chassis.angle),
      );
      const positionError = expectedPosition.subtract(wheel.position);
      // Damps the wheel's velocity *relative to the chassis*, not its
      // absolute velocity: damping absolute velocity would brake the whole
      // vehicle's forward motion, fighting driveForce directly.
      const relativeVelocity = chassis.velocity.subtract(wheel.velocity);
      const correctionForce = positionError
        .multiply(wheelPositionStiffness)
        .add(relativeVelocity.multiply(wheelPositionDamping));

      // Applied to both bodies, equal and opposite, like a real linkage: a
      // one-sided force on just the wheel doesn't conserve momentum for the
      // wheel-chassis pair, and any small asymmetry between the two wheels'
      // corrections would otherwise pump net momentum into the vehicle,
      // making it drift even with no drive input.
      wheel.applyForce(correctionForce);
      chassis.applyForce(correctionForce.negate());
    }

    return null;
  },
  run: (result) => {
    const [motorComponent] = result.components;

    motorComponent.targetAngularVelocity = clamp(
      chassis.velocity.x / wheelRadius,
      -maxWheelAngularVelocity,
      maxWheelAngularVelocity,
    );
    motorComponent.maxTorque = wheelSpinMaxTorque;
  },
});
