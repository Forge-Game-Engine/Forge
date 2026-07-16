import { describe, expect, it } from 'vitest';
import { DistanceJoint } from './distance-joint.js';
import { Vector2 } from '../../math/index.js';
import { PhysicsWorld } from '../physics-world.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

describe('DistanceJoint', () => {
  describe('length default', () => {
    it('should default length to the distance between the anchors at construction time', () => {
      const bodyA = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0, 0),
      });
      const bodyB = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(5, 0),
      });

      const joint = new DistanceJoint({ bodyA, bodyB });

      expect(joint.length).toBeCloseTo(5);
    });
  });

  describe('solving under gravity', () => {
    it('should converge two bodies toward the target length', () => {
      const world = new PhysicsWorld({ gravity: new Vector2(0, 9.8) });
      const anchorBody = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0, 0),
        isStatic: true,
      });
      const hangingBody = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0, 1),
        density: 1,
      });

      world.addBody(anchorBody);
      world.addBody(hangingBody);
      world.addJoint(
        new DistanceJoint({ bodyA: anchorBody, bodyB: hangingBody, length: 3 }),
      );

      for (let i = 0; i < 60; i++) {
        world.step(1 / 60);
      }

      const distance = hangingBody.position.distanceTo(anchorBody.position);

      expect(distance).toBeCloseTo(3, 1);
    });
  });

  describe('collideConnected', () => {
    it('should suppress collision events between jointed bodies by default', () => {
      const world = new PhysicsWorld();
      const bodyA = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0, 0),
      });
      const bodyB = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(1, 0),
      });

      world.addBody(bodyA);
      world.addBody(bodyB);
      world.addJoint(new DistanceJoint({ bodyA, bodyB, length: 1 }));

      world.step(0);

      expect(world.collisionStarts).toHaveLength(0);
    });

    it('should still report collision events when collideConnected is true', () => {
      const world = new PhysicsWorld();
      const bodyA = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(0, 0),
      });
      const bodyB = new RigidBody({
        shape: new CircleShape(1),
        position: new Vector2(1, 0),
      });

      world.addBody(bodyA);
      world.addBody(bodyB);
      world.addJoint(
        new DistanceJoint({ bodyA, bodyB, length: 1, collideConnected: true }),
      );

      world.step(0);

      expect(world.collisionStarts).toHaveLength(1);
    });
  });
});
