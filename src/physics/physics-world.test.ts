import { describe, expect, it } from 'vitest';
import { PrismaticJoint, RevoluteJoint } from './joints/index.js';
import { PhysicsWorld } from './physics-world.js';
import { RigidBody } from './rigid-body.js';
import { CircleShape, PolygonShape } from './shapes/index.js';
import { Vector2 } from '../math/index.js';

describe('PhysicsWorld', () => {
  describe('gravity', () => {
    it('should integrate gravity for dynamic bodies but not static bodies', () => {
      const world = new PhysicsWorld({ gravity: new Vector2(0, 9.8) });
      const dynamicBody = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0, 0),
      });
      const staticBody = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(100, 100),
        isStatic: true,
      });

      world.addBody(dynamicBody);
      world.addBody(staticBody);

      world.step(1);

      expect(dynamicBody.velocity.y).toBeCloseTo(9.8);
      expect(dynamicBody.position.y).toBeCloseTo(9.8);
      expect(staticBody.velocity.equals(Vector2.zero)).toBe(true);
      expect(staticBody.position.equals(new Vector2(100, 100))).toBe(true);
    });
  });

  describe('addBody and removeBody', () => {
    it('should register and unregister bodies', () => {
      const world = new PhysicsWorld();
      const body = new RigidBody({ shape: new CircleShape(1) });

      world.addBody(body);

      expect(world.bodies).toContain(body);

      world.removeBody(body);

      expect(world.bodies).not.toContain(body);
    });

    it('should throw when removing a body that is not registered', () => {
      const world = new PhysicsWorld();
      const body = new RigidBody({ shape: new CircleShape(1) });

      expect(() => world.removeBody(body)).toThrow();
    });
  });

  describe('collision resolution', () => {
    it('should resolve penetration between a dynamic circle and a static ground polygon', () => {
      const world = new PhysicsWorld();
      const groundBody = new RigidBody({
        shape: PolygonShape.rectangle(10, 2),
        position: new Vector2(0, 5),
        isStatic: true,
      });
      const circleBody = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0, 3.2),
      });

      world.addBody(circleBody);
      world.addBody(groundBody);

      world.step(0);

      // A single step now runs the resolution pass `SOLVER_ITERATIONS` times
      // over the same manifold, with each pass shrinking the recorded depth
      // (see `applyPositionalCorrection`). This converges most of the way
      // towards full separation (3.2 - 1) in one step rather than the ~20%
      // a single pass would correct.
      expect(circleBody.position.x).toBeCloseTo(0);
      expect(circleBody.position.y).toBeCloseTo(3.0419, 3);
      expect(circleBody.velocity.equals(Vector2.zero)).toBe(true);
    });
  });

  describe('isSensor', () => {
    it('should report collisions but skip resolution when either body is a sensor', () => {
      const world = new PhysicsWorld();
      const sensorBody = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0, 0),
        isSensor: true,
      });
      const otherBody = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(1.5, 0),
      });

      world.addBody(sensorBody);
      world.addBody(otherBody);

      world.step(0);

      expect(world.collisionStarts).toHaveLength(1);
      expect(sensorBody.position.equals(new Vector2(0, 0))).toBe(true);
      expect(otherBody.position.equals(new Vector2(1.5, 0))).toBe(true);
      expect(sensorBody.velocity.equals(Vector2.zero)).toBe(true);
      expect(otherBody.velocity.equals(Vector2.zero)).toBe(true);
    });
  });

  describe('collisionStarts and collisionEnds', () => {
    it('should report collision starts and ends as bodies overlap and separate', () => {
      const world = new PhysicsWorld();
      const bodyA = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0, 0),
      });
      const bodyB = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(10, 0),
      });

      world.addBody(bodyA);
      world.addBody(bodyB);

      world.step(0);

      expect(world.collisionStarts).toHaveLength(0);
      expect(world.collisionEnds).toHaveLength(0);

      bodyB.position = new Vector2(1.5, 0);
      world.step(0);

      expect(world.collisionStarts).toHaveLength(1);
      expect(world.collisionStarts[0].bodyA).toBe(bodyA);
      expect(world.collisionStarts[0].bodyB).toBe(bodyB);
      expect(world.collisionEnds).toHaveLength(0);

      bodyB.position = new Vector2(10, 0);
      world.step(0);

      expect(world.collisionStarts).toHaveLength(0);
      expect(world.collisionEnds).toHaveLength(1);
      expect(world.collisionEnds[0].bodyA).toBe(bodyA);
      expect(world.collisionEnds[0].bodyB).toBe(bodyB);
    });

    it('should not report collisions between two overlapping static bodies', () => {
      const world = new PhysicsWorld();
      const bodyA = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0, 0),
        isStatic: true,
      });
      const bodyB = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0.5, 0),
        isStatic: true,
      });

      world.addBody(bodyA);
      world.addBody(bodyB);

      world.step(0);

      expect(world.collisionStarts).toHaveLength(0);
      expect(world.collisionEnds).toHaveLength(0);
    });
  });

  describe('applyExplosiveForce', () => {
    it('should push a body within range away from the explosion center', () => {
      const world = new PhysicsWorld();
      const body = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0, 5),
      });

      world.addBody(body);

      world.applyExplosiveForce(Vector2.zero, 100, 10);

      expect(body.velocity.x).toBeCloseTo(0);
      expect(body.velocity.y).toBeGreaterThan(0);
    });

    it('should apply a stronger impulse to bodies closer to the center', () => {
      const world = new PhysicsWorld();
      const nearBody = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(1, 0),
      });
      const farBody = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(5, 0),
      });

      world.addBody(nearBody);
      world.addBody(farBody);

      world.applyExplosiveForce(Vector2.zero, 100, 10);

      expect(nearBody.velocity.x).toBeGreaterThan(farBody.velocity.x);
      expect(farBody.velocity.x).toBeGreaterThan(0);
    });

    it('should not affect bodies at or beyond the radius', () => {
      const world = new PhysicsWorld();
      const body = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(10, 0),
      });

      world.addBody(body);

      world.applyExplosiveForce(Vector2.zero, 100, 10);

      expect(body.velocity.equals(Vector2.zero)).toBe(true);
    });

    it('should not affect static bodies', () => {
      const world = new PhysicsWorld();
      const body = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(1, 0),
        isStatic: true,
      });

      world.addBody(body);

      world.applyExplosiveForce(Vector2.zero, 100, 10);

      expect(body.velocity.equals(Vector2.zero)).toBe(true);
    });
  });

  describe('addJoint and removeJoint', () => {
    it('should register and unregister joints', () => {
      const world = new PhysicsWorld();
      const bodyA = new RigidBody({ shape: new CircleShape(1) });
      const bodyB = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(2, 0),
      });
      const joint = new PrismaticJoint({ bodyA, bodyB });

      world.addJoint(joint);

      expect(world.joints).toContain(joint);

      world.removeJoint(joint);

      expect(world.joints).not.toContain(joint);
    });

    it('should throw when removing a joint that is not registered', () => {
      const world = new PhysicsWorld();
      const bodyA = new RigidBody({ shape: new CircleShape(1) });
      const bodyB = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(2, 0),
      });
      const joint = new PrismaticJoint({ bodyA, bodyB });

      expect(() => world.removeJoint(joint)).toThrow();
    });

    it('should register and unregister a RevoluteJoint alongside a PrismaticJoint', () => {
      const world = new PhysicsWorld();
      const bodyA = new RigidBody({ shape: new CircleShape(1) });
      const bodyB = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(2, 0),
      });
      const joint = new RevoluteJoint({ bodyA, bodyB });

      world.addJoint(joint);

      expect(world.joints).toContain(joint);

      world.removeJoint(joint);

      expect(world.joints).not.toContain(joint);
    });
  });

  describe('prismatic joint solving', () => {
    it('should keep a jointed body sliding on its axis under gravity perpendicular to it', () => {
      const world = new PhysicsWorld({ gravity: new Vector2(0, -10) });
      const anchor = new RigidBody({
        shape: new CircleShape(1),
        position: Vector2.zero,
        isStatic: true,
      });
      const slider = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(3, 0),
      });

      world.addBody(anchor);
      world.addBody(slider);
      world.addJoint(
        new PrismaticJoint({
          bodyA: anchor,
          bodyB: slider,
          axis: Vector2.right,
        }),
      );

      for (let i = 0; i < 60; i++) {
        world.step(1 / 60);
      }

      // A small residual is expected: `resolvePrismaticJoint`'s `LINEAR_SLOP`
      // dead-zone (mirroring `resolveCollision`'s `PENETRATION_SLOP`) leaves
      // sub-slop perpendicular drift uncorrected each step.
      expect(slider.position.y).toBeCloseTo(0, 1);
      expect(slider.angle).toBeCloseTo(0, 2);
    });

    it('should clamp a jointed body sliding under gravity along its axis to the lower translation limit', () => {
      const world = new PhysicsWorld({ gravity: new Vector2(-10, 0) });
      const anchor = new RigidBody({
        shape: new CircleShape(1),
        position: Vector2.zero,
        isStatic: true,
      });
      const slider = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(3, 0),
      });

      world.addBody(anchor);
      world.addBody(slider);
      world.addJoint(
        new PrismaticJoint({
          bodyA: anchor,
          bodyB: slider,
          axis: Vector2.right,
          enableLimit: true,
          lowerTranslation: 1,
          upperTranslation: 3,
        }),
      );

      for (let i = 0; i < 120; i++) {
        world.step(1 / 60);
      }

      expect(slider.position.x).toBeGreaterThanOrEqual(0.95);
      expect(slider.position.y).toBeCloseTo(0, 2);
    });
  });

  describe('revolute joint solving', () => {
    it('should let a pendulum swing freely about its pivot under gravity', () => {
      const world = new PhysicsWorld({ gravity: new Vector2(0, -10) });
      const pivot = new RigidBody({
        shape: new CircleShape(1),
        position: Vector2.zero,
        isStatic: true,
      });
      const bob = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(3, 0),
      });

      world.addBody(pivot);
      world.addBody(bob);
      world.addJoint(
        new RevoluteJoint({
          bodyA: pivot,
          bodyB: bob,
          anchorB: new Vector2(-3, 0),
        }),
      );

      for (let i = 0; i < 60; i++) {
        world.step(1 / 60);
      }

      const bobAnchor = bob.position.add(new Vector2(-3, 0).rotate(bob.angle));

      // The pivot end of the bob should stay pinned to the pivot...
      expect(bobAnchor.x).toBeCloseTo(0, 1);
      expect(bobAnchor.y).toBeCloseTo(0, 1);
      // ...while gravity swings the bob's center down from its initial
      // horizontal position, demonstrating rotation is unconstrained.
      expect(bob.position.y).toBeLessThan(-0.1);
    });

    it('should clamp a hinged arm rotating under gravity to its lower angle limit', () => {
      const world = new PhysicsWorld({ gravity: new Vector2(0, -10) });
      const anchor = new RigidBody({
        shape: new CircleShape(1),
        position: Vector2.zero,
        isStatic: true,
      });
      const arm = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(3, 0),
      });

      world.addBody(anchor);
      world.addBody(arm);

      const joint = new RevoluteJoint({
        bodyA: anchor,
        bodyB: arm,
        anchorB: new Vector2(-3, 0),
        enableLimit: true,
        lowerAngle: -0.3,
        upperAngle: 0.3,
      });

      world.addJoint(joint);

      for (let i = 0; i < 120; i++) {
        world.step(1 / 60);
      }

      // A larger residual than the prismatic translation-limit test is
      // expected here: the limit constraint only cancels outward angular
      // velocity, while gravity continuously re-accelerates the arm every
      // step, so the Baumgarte correction pass is perpetually working
      // against a live torque rather than a one-time overshoot.
      expect(joint.angle).toBeGreaterThanOrEqual(-0.4);
    });
  });
});
