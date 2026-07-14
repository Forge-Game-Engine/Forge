import { describe, expect, it } from 'vitest';
import { RigidBody } from './rigid-body.js';
import { CircleShape, PolygonShape } from './shapes/index.js';
import { Vector2 } from '../math/index.js';

describe('RigidBody', () => {
  describe('defaults', () => {
    it('should apply default values when no options are provided', () => {
      const body = new RigidBody({ shape: new CircleShape(1) });

      expect(body.position.equals(Vector2.zero)).toBe(true);
      expect(body.angle).toBe(0);
      expect(body.velocity.equals(Vector2.zero)).toBe(true);
      expect(body.angularVelocity).toBe(0);
      expect(body.isStatic).toBe(false);
      expect(body.isSensor).toBe(false);
      expect(body.restitution).toBeCloseTo(0.2);
      expect(body.friction).toBeCloseTo(0.3);
    });

    it('should not share a position instance between bodies using default options', () => {
      const bodyA = new RigidBody({ shape: new CircleShape(1) });
      const bodyB = new RigidBody({ shape: new CircleShape(1) });

      bodyA.position.x = 100;

      expect(bodyB.position.x).toBe(0);
    });
  });

  describe('mass properties', () => {
    it('should have zero mass and inertia for static bodies', () => {
      const body = new RigidBody({
        shape: PolygonShape.rectangle(2, 2),
        isStatic: true,
      });

      expect(body.mass).toBe(0);
      expect(body.inverseMass).toBe(0);
      expect(body.inertia).toBe(0);
      expect(body.inverseInertia).toBe(0);
    });

    it('should calculate mass and inertia for a dynamic circle body', () => {
      const shape = new CircleShape(2);
      const body = new RigidBody({ shape, density: 1 });

      const expectedMass = shape.getArea();
      const expectedInertia = shape.getMomentOfInertia(expectedMass);

      expect(body.mass).toBeCloseTo(expectedMass);
      expect(body.inverseMass).toBeCloseTo(1 / expectedMass);
      expect(body.inertia).toBeCloseTo(expectedInertia);
      expect(body.inverseInertia).toBeCloseTo(1 / expectedInertia);
    });

    it('should calculate mass and inertia for a dynamic polygon body', () => {
      const shape = PolygonShape.rectangle(4, 2);
      const density = 2;
      const body = new RigidBody({ shape, density });

      const expectedMass = shape.getArea() * density;
      const expectedInertia = shape.getMomentOfInertia(expectedMass);

      expect(body.mass).toBeCloseTo(expectedMass);
      expect(body.inverseMass).toBeCloseTo(1 / expectedMass);
      expect(body.inertia).toBeCloseTo(expectedInertia);
      expect(body.inverseInertia).toBeCloseTo(1 / expectedInertia);
    });
  });

  describe('isSensor', () => {
    it('should be true when explicitly set', () => {
      const body = new RigidBody({
        shape: new CircleShape(1),
        isSensor: true,
      });

      expect(body.isSensor).toBe(true);
    });
  });

  describe('id', () => {
    it('should assign unique, incrementing ids to each body', () => {
      const bodyA = new RigidBody({ shape: new CircleShape(1) });
      const bodyB = new RigidBody({ shape: new CircleShape(1) });

      expect(bodyB.id).toBeGreaterThan(bodyA.id);
    });
  });

  describe('aabb', () => {
    it('should derive a square aabb from the bounding radius', () => {
      const body = new RigidBody({
        shape: new CircleShape(2),
        position: new Vector2(5, 5),
      });

      expect(body.aabb.origin.x).toBeCloseTo(3);
      expect(body.aabb.origin.y).toBeCloseTo(3);
      expect(body.aabb.size.x).toBeCloseTo(4);
      expect(body.aabb.size.y).toBeCloseTo(4);
    });

    it('should return the cached aabb instance while the position is unchanged', () => {
      const body = new RigidBody({
        shape: new CircleShape(2),
        position: new Vector2(5, 5),
      });

      expect(body.aabb).toBe(body.aabb);
    });

    it('should recompute the aabb after the position changes', () => {
      const body = new RigidBody({
        shape: new CircleShape(2),
        position: new Vector2(5, 5),
      });

      const initialAabb = body.aabb;

      body.position = new Vector2(10, 5);

      const updatedAabb = body.aabb;

      expect(updatedAabb).not.toBe(initialAabb);
      expect(updatedAabb.origin.x).toBeCloseTo(8);
    });

    it('should recompute the aabb after the position is mutated in place', () => {
      const body = new RigidBody({
        shape: new CircleShape(2),
        position: new Vector2(5, 5),
      });

      const initialAabb = body.aabb;

      body.position.x = 10;

      const updatedAabb = body.aabb;

      expect(updatedAabb).not.toBe(initialAabb);
      expect(updatedAabb.origin.x).toBeCloseTo(8);
    });
  });

  describe('applyImpulse', () => {
    it('should change linear and angular velocity based on the contact point', () => {
      const shape = new CircleShape(1);
      const body = new RigidBody({ shape, density: 1 });

      const impulse = new Vector2(1, 0);
      const contactPoint = new Vector2(0, 1);

      body.applyImpulse(impulse, contactPoint);

      expect(body.velocity.x).toBeCloseTo(body.inverseMass);
      expect(body.velocity.y).toBeCloseTo(0);
      expect(body.angularVelocity).toBeCloseTo(
        body.inverseInertia * contactPoint.cross(impulse),
      );
    });

    it('should not change velocity for static bodies', () => {
      const body = new RigidBody({
        shape: new CircleShape(1),
        isStatic: true,
      });

      body.applyImpulse(new Vector2(10, 10), new Vector2(1, 1));

      expect(body.velocity.equals(Vector2.zero)).toBe(true);
      expect(body.angularVelocity).toBe(0);
    });
  });

  describe('restitution and friction clamping', () => {
    it('should clamp restitution and friction to [0, 1]', () => {
      const body = new RigidBody({
        shape: new CircleShape(1),
        restitution: 1.5,
        friction: -0.5,
      });

      expect(body.restitution).toBe(1);
      expect(body.friction).toBe(0);
    });
  });
});
