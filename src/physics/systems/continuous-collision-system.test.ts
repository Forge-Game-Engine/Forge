import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { addAabbComponent } from '../components/aabb-component.js';
import { addColliderComponent } from '../components/collider-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
} from '../components/rigidbody-component.js';
import { CollisionPair } from '../types/collision-pair.js';
import { createBroadPhaseEcsSystem } from './broad-phase-system.js';
import { createContinuousCollisionEcsSystem } from './continuous-collision-system.js';

const fixedDeltaMilliseconds = 1000 / 60;

// `PolygonCollider` re-centers whatever vertices it's given around their own
// centroid, so a box authored symmetrically around y=0 (rather than e.g.
// `[-10, 0]`) is the one shape guaranteed not to shift after construction -
// keeping its top face at exactly `GROUND_TOP_Y` once placed at `y: 0`.
const GROUND_HALF_HEIGHT = 5;
const GROUND_TOP_Y = GROUND_HALF_HEIGHT;

describe('createContinuousCollisionEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);
    time.update(fixedDeltaMilliseconds);

    // Registered so every entity's `AabbEcsComponent` reflects its actual
    // current shape/position each tick (as it would in a real pipeline,
    // where broad-phase always runs before CCD) - `createAabbComponent`
    // alone defaults to a degenerate zero-sized box, which would make the
    // system's own swept-AABB pre-filter (§8 Open Question 2 in the
    // design doc) reject every candidate outside a thin sliver around the
    // origin.
    const collisionPairs: CollisionPair[] = [];

    world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
    world.addSystem(createContinuousCollisionEcsSystem(time));
  });

  function addFlatGround(halfWidth: number): void {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { world: { x: 0, y: 0 } });
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider: new PolygonCollider([
        { x: -halfWidth, y: -GROUND_HALF_HEIGHT },
        { x: halfWidth, y: -GROUND_HALF_HEIGHT },
        { x: halfWidth, y: GROUND_HALF_HEIGHT },
        { x: -halfWidth, y: GROUND_HALF_HEIGHT },
      ]),
    });
    addAabbComponent(world, entity);
  }

  function addCircle(
    position: Vector2,
    radius: number,
    velocity: Vector2,
  ): RigidBodyEcsComponent {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { world: position });
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider: new CircleCollider(radius),
    });
    addAabbComponent(world, entity);

    return addRigidBodyComponent(world, entity, {
      mass: 1,
      momentOfInertia: 1,
      velocity,
    });
  }

  it('does not clamp a body moving slower than the detection threshold', () => {
    addFlatGround(1000);

    // Radius 50, threshold 0.15 -> needs > 7.5 units/tick to engage; this
    // moves only 1 unit/tick, high above the ground.
    const rigidBody = addCircle({ x: 0, y: -500 }, 50, { x: 60, y: 0 });

    world.update();

    expect(rigidBody.continuousCollisionTranslationClamp).toBeNull();
  });

  it('clamps a fast body about to tunnel through the ground this tick', () => {
    addFlatGround(1000);

    const radius = 50;
    const restingHeight = GROUND_TOP_Y + radius;
    const startY = restingHeight + 5;
    // The ground's top face faces +y, so a resting circle's center sits at
    // `restingHeight`. Starting 5 units above that, with a fast enough
    // fall (-y) to overshoot past the ground by tens of units if unclamped.
    const rigidBody = addCircle({ x: 0, y: startY }, radius, {
      x: 0,
      y: -1400,
    });

    world.update();

    expect(rigidBody.continuousCollisionTranslationClamp).not.toBeNull();

    const clampedTranslation = rigidBody.continuousCollisionTranslationClamp!;
    const clampedY = startY + clampedTranslation.y;

    // Lands essentially exactly at the resting height, not tens of units
    // past it.
    expect(Math.abs(clampedY - restingHeight)).toBeLessThan(0.01);
  });

  it('does not clamp a body already resting on the ground, even while moving fast tangentially', () => {
    addFlatGround(1000);

    const radius = 50;
    // Resting exactly at contact height already - this is the shape of a
    // wheel rolling fast up a slope: large velocity magnitude, but none of
    // it is "about to newly cross into the ground this tick," since it's
    // already touching at the start position. Ordinary broad/narrow-phase
    // and collision resolution already see and handle this same contact
    // this same tick.
    const rigidBody = addCircle({ x: 0, y: GROUND_TOP_Y + radius }, radius, {
      x: 2000,
      y: 0,
    });

    world.update();

    expect(rigidBody.continuousCollisionTranslationClamp).toBeNull();
  });

  it('does not clamp a static body', () => {
    addFlatGround(1000);

    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      world: { x: 0, y: GROUND_TOP_Y + 50 },
    });
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, { collider: new CircleCollider(50) });
    addAabbComponent(world, entity);

    const rigidBody = addRigidBodyComponent(world, entity, {
      mass: 1,
      momentOfInertia: 1,
      velocity: { x: 0, y: 1400 },
      type: 'static',
    });

    world.update();

    expect(rigidBody.continuousCollisionTranslationClamp).toBeNull();
  });

  it('does not clamp a body with continuousDetection disabled', () => {
    addFlatGround(1000);

    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      world: { x: 0, y: GROUND_TOP_Y + 50 },
    });
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, { collider: new CircleCollider(50) });
    addAabbComponent(world, entity);

    const rigidBody = addRigidBodyComponent(world, entity, {
      mass: 1,
      momentOfInertia: 1,
      velocity: { x: 0, y: 1400 },
      continuousDetection: false,
    });

    world.update();

    expect(rigidBody.continuousCollisionTranslationClamp).toBeNull();
  });

  it('still clamps against a static target that has an explicit non-dynamic RigidBodyEcsComponent', () => {
    const groundEntity = world.createEntity();

    addPositionComponent(world, groundEntity, { world: { x: 0, y: 0 } });
    addRotationComponent(world, groundEntity);
    addColliderComponent(world, groundEntity, {
      collider: new PolygonCollider([
        { x: -1000, y: -GROUND_HALF_HEIGHT },
        { x: 1000, y: -GROUND_HALF_HEIGHT },
        { x: 1000, y: GROUND_HALF_HEIGHT },
        { x: -1000, y: GROUND_HALF_HEIGHT },
      ]),
    });
    addAabbComponent(world, groundEntity);
    // Attaching a RigidBodyEcsComponent to a static body is legal (see
    // `RigidBodyType`'s doc) - `isStaticTarget` must still treat it as
    // static rather than only recognizing the "no component at all" case.
    addRigidBodyComponent(world, groundEntity, {
      mass: 1,
      momentOfInertia: 1,
      type: 'kinematic',
    });

    const radius = 50;
    const restingHeight = GROUND_TOP_Y + radius;
    const startY = restingHeight + 5;
    const rigidBody = addCircle({ x: 0, y: startY }, radius, {
      x: 0,
      y: -1400,
    });

    world.update();

    expect(rigidBody.continuousCollisionTranslationClamp).not.toBeNull();
  });

  it('does not sweep against another dynamic body', () => {
    const radius = 50;
    // A second dynamic circle sitting directly in the first one's path -
    // if dynamic targets were (incorrectly) swept, this would produce a
    // clamp; per the design's scope (dynamic-vs-dynamic sweeping isn't
    // supported), it must not.
    addCircle({ x: 0, y: 0 }, radius, { x: 0, y: 0 });

    const rigidBody = addCircle({ x: 0, y: radius * 2 + 5 }, radius, {
      x: 0,
      y: -1400,
    });

    world.update();

    expect(rigidBody.continuousCollisionTranslationClamp).toBeNull();
  });

  it('clamps to the earliest time of impact among several candidate static bodies', () => {
    const radius = 50;

    // A thin platform closer to the falling body than the main ground -
    // the system must pick this nearer obstacle's TOI, not the farther
    // ground's. Vertices are authored symmetrically around local y=0 (see
    // `GROUND_HALF_HEIGHT`'s own comment) so `PolygonCollider`'s centroid
    // re-centering doesn't shift them, and the entity's own position is
    // offset instead to land the top face at exactly `platformTopY`.
    const platformEntity = world.createEntity();
    const platformHalfHeight = 2;
    const platformTopY = 300;

    addPositionComponent(world, platformEntity, {
      world: { x: 0, y: platformTopY - platformHalfHeight },
    });
    addRotationComponent(world, platformEntity);
    addColliderComponent(world, platformEntity, {
      collider: new PolygonCollider([
        { x: -1000, y: -platformHalfHeight },
        { x: 1000, y: -platformHalfHeight },
        { x: 1000, y: platformHalfHeight },
        { x: -1000, y: platformHalfHeight },
      ]),
    });
    addAabbComponent(world, platformEntity);

    addFlatGround(1000);

    const platformRestingHeight = platformTopY + radius;
    const startY = platformRestingHeight + 5;
    const rigidBody = addCircle({ x: 0, y: startY }, radius, {
      x: 0,
      y: -1400,
    });

    world.update();

    expect(rigidBody.continuousCollisionTranslationClamp).not.toBeNull();

    const clampedTranslation = rigidBody.continuousCollisionTranslationClamp!;
    const clampedY = startY + clampedTranslation.y;

    // Lands on the nearer platform, nowhere near the far-below main ground.
    expect(Math.abs(clampedY - platformRestingHeight)).toBeLessThan(0.01);
  });
});
