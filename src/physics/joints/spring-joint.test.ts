import { describe, expect, it } from 'vitest';
import { SpringJoint } from './spring-joint.js';
import { Vector2 } from '../../math/index.js';
import { PhysicsWorld } from '../physics-world.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const GRAVITY_MAGNITUDE = 10;
const REST_LENGTH = 2;
const STIFFNESS = 50;
const TIME_STEP = 1 / 60;

function createHangingSpringWorld(damping: number, initialDistance: number) {
  const world = new PhysicsWorld({
    gravity: new Vector2(0, GRAVITY_MAGNITUDE),
  });
  const anchorBody = new RigidBody({
    shape: new CircleShape(1),
    position: new Vector2(0, 0),
    isStatic: true,
  });
  const hangingBody = new RigidBody({
    shape: new CircleShape(1),
    position: new Vector2(0, initialDistance),
    density: 1,
  });

  world.addBody(anchorBody);
  world.addBody(hangingBody);
  world.addJoint(
    new SpringJoint({
      bodyA: anchorBody,
      bodyB: hangingBody,
      restLength: REST_LENGTH,
      stiffness: STIFFNESS,
      damping,
    }),
  );

  return { world, anchorBody, hangingBody };
}

describe('SpringJoint', () => {
  describe('restLength default', () => {
    it('should default restLength to the distance between the anchors at construction time', () => {
      const bodyA = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0, 0),
      });
      const bodyB = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(4, 0),
      });

      const joint = new SpringJoint({
        bodyA,
        bodyB,
        stiffness: 10,
        damping: 1,
      });

      expect(joint.restLength).toBeCloseTo(4);
    });
  });

  describe('equilibrium under gravity', () => {
    it('should settle at the distance where spring force balances gravity', () => {
      const criticalDamping = 2 * Math.sqrt(STIFFNESS * Math.PI);
      const { world, anchorBody, hangingBody } = createHangingSpringWorld(
        criticalDamping,
        REST_LENGTH,
      );

      for (let i = 0; i < 300; i++) {
        world.step(TIME_STEP);
      }

      const mass = hangingBody.mass;
      const equilibriumExtension = (mass * GRAVITY_MAGNITUDE) / STIFFNESS;
      const expectedDistance = REST_LENGTH + equilibriumExtension;

      const distance = hangingBody.position.distanceTo(anchorBody.position);

      expect(distance).toBeCloseTo(expectedDistance, 1);
    });
  });

  describe('damping', () => {
    it('should decay oscillation amplitude over time when damping is positive', () => {
      const { world, anchorBody, hangingBody } = createHangingSpringWorld(
        3,
        REST_LENGTH,
      );

      const mass = hangingBody.mass;
      const equilibriumDistance =
        REST_LENGTH + (mass * GRAVITY_MAGNITUDE) / STIFFNESS;

      const totalSteps = 240;
      const deviations: number[] = [];

      for (let i = 0; i < totalSteps; i++) {
        world.step(TIME_STEP);

        deviations.push(
          Math.abs(
            hangingBody.position.distanceTo(anchorBody.position) -
              equilibriumDistance,
          ),
        );
      }

      const firstQuarterMax = Math.max(...deviations.slice(0, 60));
      const lastQuarterMax = Math.max(...deviations.slice(180, 240));

      expect(firstQuarterMax).toBeGreaterThan(0.1);
      expect(lastQuarterMax).toBeLessThan(firstQuarterMax * 0.5);
    });

    it('should not decay oscillation amplitude when damping is zero', () => {
      const { world, anchorBody, hangingBody } = createHangingSpringWorld(
        0,
        REST_LENGTH,
      );

      const mass = hangingBody.mass;
      const equilibriumDistance =
        REST_LENGTH + (mass * GRAVITY_MAGNITUDE) / STIFFNESS;

      const totalSteps = 240;
      const deviations: number[] = [];

      for (let i = 0; i < totalSteps; i++) {
        world.step(TIME_STEP);

        deviations.push(
          Math.abs(
            hangingBody.position.distanceTo(anchorBody.position) -
              equilibriumDistance,
          ),
        );
      }

      const firstQuarterMax = Math.max(...deviations.slice(0, 60));
      const lastQuarterMax = Math.max(...deviations.slice(180, 240));

      expect(firstQuarterMax).toBeGreaterThan(0.1);
      expect(lastQuarterMax).toBeGreaterThan(firstQuarterMax * 0.5);
    });
  });
});
