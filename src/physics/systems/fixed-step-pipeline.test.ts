import { describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
  registerFixedUpdate,
  RotationEcsComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { addColliderComponent } from '../components/collider-component.js';
import { addGravityComponent } from '../components/gravity-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
} from '../components/rigidbody-component.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { CollisionPair } from '../types/collision-pair.js';
import { ContactConstraint } from '../types/contact-constraint.js';
import { createAngularVelocityMotorEcsSystem } from './angular-velocity-motor-system.js';
import { createBroadPhaseEcsSystem } from './broad-phase-system.js';
import { createCollisionResolutionEcsSystem } from './collision-resolution-system.js';
import { createContinuousCollisionEcsSystem } from './continuous-collision-system.js';
import { createEulerIntegrationEcsSystem } from './euler-integration-system.js';
import { createGravityEcsSystem } from './gravity-system.js';
import { createLinearDamperEcsSystem } from './linear-damper-system.js';
import { createLinearSpringEcsSystem } from './linear-spring-system.js';
import { createNarrowPhaseEcsSystem } from './narrow-phase-system.js';
import { createPrismaticJointEcsSystem } from './prismatic-joint-system.js';
import { createRevoluteJointEcsSystem } from './revolute-joint-system.js';
import { createSleepEcsSystem } from './sleep-system.js';

// 15.625 ms. It and every frame length below are multiples of 1/128 ms,
// exact in binary, so each pattern's accumulator and clock arithmetic is
// exact and every pattern takes exactly the same steps.
const fixedDeltaMilliseconds = 1000 / 64;

const frameRatePatterns: Record<string, number[]> = {
  // 32 frames per second, two steps each.
  slowFrames: Array.from({ length: 32 }, () => 31.25),
  // 128 frames per second, a step every other frame.
  fastFrames: Array.from({ length: 128 }, () => 7.8125),
  // Uneven frames, one of three steps, that add up to 125 ms.
  unevenFrames: Array.from({ length: 8 }, () => [
    7.8125, 46.875, 15.625, 31.25, 23.4375,
  ]).flat(),
};

interface BallState {
  steps: number;
  position: Vector2;
  rotation: number;
  velocity: Vector2;
}

interface FallResult {
  /** The ball after the frames that end at 500 ms. */
  halfway: BallState;
  /** The ball after the frames that end at 1000 ms. */
  end: BallState;
  /** Whether every frame ended with the ball's `world` equal to its `local`. */
  worldFollowedLocal: boolean;
}

function boxCollider(width: number, height: number): PolygonCollider {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return new PolygonCollider([
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ]);
}

/**
 * Drops a bouncy ball 200 units onto a static floor, with the physics
 * systems registered in the fixed-update group as the docs show, and runs
 * the given frames.
 * @param frames - Each frame's length, in milliseconds.
 * @param withFixedTransformPass - Whether the fixed-update group starts
 * with a transform system.
 * @returns The ball at 500 ms and 1000 ms.
 */
function dropBall(
  frames: readonly number[],
  withFixedTransformPass = true,
): FallResult {
  const world = new EcsWorld();
  const time = new Time();

  time.fixedDeltaTimeInMilliseconds = fixedDeltaMilliseconds;

  let now = 0;

  time.update(now);

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];
  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };
  let steps = 0;

  world.addSystem(
    {
      query: [],
      update: (): void => {
        steps++;
      },
    },
    physics,
  );

  if (withFixedTransformPass) {
    world.addSystem(createTransformEcsSystem(), physics);
  }

  world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    physics,
  );
  world.addSystem(createSleepEcsSystem(collisionManifolds, time), physics);
  world.addSystem(createGravityEcsSystem(time), physics);
  world.addSystem(createLinearSpringEcsSystem(time), physics);
  world.addSystem(createLinearDamperEcsSystem(time), physics);
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
    physics,
  );
  world.addSystem(createRevoluteJointEcsSystem(time), physics);
  world.addSystem(createPrismaticJointEcsSystem(time), physics);
  world.addSystem(createAngularVelocityMotorEcsSystem(time), physics);
  world.addSystem(createEulerIntegrationEcsSystem(time), physics);
  world.addSystem(createContinuousCollisionEcsSystem(), physics);
  world.addSystem(createTransformEcsSystem());

  // A static floor whose top face is at `y = 0` (`+Y` is down).
  const floor = world.createEntity();

  addPositionComponent(world, floor, { local: { x: 0, y: 10 } });
  addRotationComponent(world, floor);
  addColliderComponent(world, floor, {
    collider: boxCollider(400, 20),
    restitution: 0.5,
  });

  const ball = world.createEntity();
  const position: PositionEcsComponent = addPositionComponent(world, ball, {
    local: { x: 0, y: -210 },
  });
  const rotation: RotationEcsComponent = addRotationComponent(world, ball);
  const rigidBody: RigidBodyEcsComponent = addRigidBodyComponent(world, ball);

  addColliderComponent(world, ball, {
    collider: new CircleCollider(10),
    restitution: 0.5,
  });
  addGravityComponent(world, ball, { amount: { x: 0, y: 2000 } });

  const snapshot = (): BallState => ({
    steps,
    position: { ...position.local },
    rotation: rotation.local,
    velocity: { ...rigidBody.velocity },
  });

  let halfway: BallState | null = null;
  let worldFollowedLocal = true;

  for (const frame of frames) {
    now += frame;
    time.update(now);
    world.update();

    worldFollowedLocal &&=
      position.world.x === position.local.x &&
      position.world.y === position.local.y;

    if (now === 500) {
      halfway = snapshot();
    }
  }

  if (!halfway || now !== 1000) {
    throw new Error(
      'Each frame pattern must have frame boundaries at 500 ms and 1000 ms.',
    );
  }

  return { halfway, end: snapshot(), worldFollowedLocal };
}

describe('the physics pipeline in the fixed-update group', () => {
  const results = Object.fromEntries(
    Object.entries(frameRatePatterns).map(([name, frames]) => [
      name,
      dropBall(frames),
    ]),
  );

  it.each(Object.keys(frameRatePatterns))(
    'should take one step per fixed delta with %s',
    (name) => {
      expect(results[name].halfway.steps).toBe(32);
      expect(results[name].end.steps).toBe(64);
    },
  );

  it('should bounce the ball on the floor before 500 ms', () => {
    const { halfway } = results.slowFrames;

    // Moving up, off the floor: it has landed and bounced.
    expect(halfway.velocity.y).toBeLessThan(0);
    expect(halfway.position.y).toBeLessThan(-10);
  });

  it.each(['fastFrames', 'unevenFrames'])(
    'should end in the same state with %s as with slowFrames',
    (name) => {
      expect(results[name].halfway).toEqual(results.slowFrames.halfway);
      expect(results[name].end).toEqual(results.slowFrames.end);
    },
  );

  it.each(Object.keys(frameRatePatterns))(
    'should leave every frame with the ball drawn where it is with %s',
    (name) => {
      expect(results[name].worldFollowedLocal).toBe(true);
    },
  );

  it('should give a different result without a transform pass in each step', () => {
    const withoutFixedPass = dropBall(frameRatePatterns.slowFrames, false);

    expect(withoutFixedPass.halfway).not.toEqual(results.slowFrames.halfway);
  });
});
