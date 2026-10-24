import { AngularVelocityMotorEcsComponent } from './components/angular-velocity-motor-component.js';
import { RigidBodyEcsComponent } from './components/rigidbody-component.js';

/**
 * Whether an angular velocity motor can change its body's angular velocity:
 * the motor has torque to apply and the body is `'dynamic'` without
 * `fixedRotation`. Torque doesn't turn a `'static'` or `'kinematic'` body
 * or a fixed-rotation one, since their inverse moment of inertia is `0`.
 * The motor system skips a body this is `false` for, and the sleep system
 * only keeps a body awake for a motor this is `true` for, so both agree on
 * which motors drive their body.
 * @param motor - The motor.
 * @param rigidBody - The motor's body.
 * @returns Whether the motor can turn the body.
 */
export function canMotorTurnBody(
  motor: AngularVelocityMotorEcsComponent,
  rigidBody: RigidBodyEcsComponent,
): boolean {
  return (
    motor.maxTorque > 0 &&
    rigidBody.type === 'dynamic' &&
    !rigidBody.fixedRotation
  );
}
