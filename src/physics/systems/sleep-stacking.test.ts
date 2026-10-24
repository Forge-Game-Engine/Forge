import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
  RotationEcsComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { applyImpulse } from '../apply-impluse.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { addAngularVelocityMotorComponent } from '../components/angular-velocity-motor-component.js';
import { addColliderComponent } from '../components/collider-component.js';
import {
  addGravityComponent,
  GravityEcsComponent,
} from '../components/gravity-component.js';
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
import { createEulerIntegrationEcsSystem } from './euler-integration-system.js';
import { createGravityEcsSystem } from './gravity-system.js';
import { createNarrowPhaseEcsSystem } from './narrow-phase-system.js';
import { createSleepEcsSystem } from './sleep-system.js';

const fixedDeltaMilliseconds = 1000 / 60;
const ticksPerSecond = 60;

interface Box {
  entity: number;
  rigidBody: RigidBodyEcsComponent;
  position: PositionEcsComponent;
  rotation: RotationEcsComponent;
  gravity: GravityEcsComponent;
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

describe('sleeping bodies in a physics scene', () => {
  let world: EcsWorld;
  let time: Time;
  let collisionManifolds: CollisionManifold[];
  let contactConstraints: ContactConstraint[];
  let floor: number;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);

    const collisionPairs: CollisionPair[] = [];

    collisionManifolds = [];
    contactConstraints = [];

    world.addSystem(createTransformEcsSystem());
    world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
    world.addSystem(
      createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    );
    world.addSystem(createSleepEcsSystem(collisionManifolds, time));
    world.addSystem(createGravityEcsSystem(time));
    world.addSystem(
      createCollisionResolutionEcsSystem(
        collisionManifolds,
        contactConstraints,
        time,
      ),
    );
    world.addSystem(createAngularVelocityMotorEcsSystem(time));
    world.addSystem(createEulerIntegrationEcsSystem(time));

    // A static floor whose top face is at `y = 0` (`+Y` is down).
    floor = world.createEntity();
    addPositionComponent(world, floor, { local: { x: 0, y: 5 } });
    addRotationComponent(world, floor);
    addColliderComponent(world, floor, {
      collider: boxCollider(40, 10),
      restitution: 0,
    });
  });

  function addBox(center: Vector2): Box {
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, { local: center });
    const rotation = addRotationComponent(world, entity);

    addColliderComponent(world, entity, {
      collider: boxCollider(1, 1),
      restitution: 0,
    });

    const rigidBody = addRigidBodyComponent(world, entity);
    const gravity = addGravityComponent(world, entity);

    return { entity, rigidBody, position, rotation, gravity };
  }

  function tick(): void {
    time.update(time.rawTimeInMilliseconds + fixedDeltaMilliseconds);
    world.update();
  }

  /**
   * Ticks until every box is asleep, checking that no box falls asleep
   * before the others, and returns how many ticks it took.
   */
  function tickUntilAsleep(boxes: Box[], maxTicks: number): number {
    for (let i = 1; i <= maxTicks; i++) {
      tick();

      const asleep = boxes.filter((box) => box.rigidBody.isSleeping).length;

      if (asleep === boxes.length) {
        return i;
      }

      // Every box here is in one island, so they fall asleep together.
      expect(asleep).toBe(0);
    }

    throw new Error(`The boxes didn't fall asleep in ${maxTicks} ticks.`);
  }

  function floorPenetration(entity: number): number {
    return Math.max(
      0,
      ...collisionManifolds
        .filter(
          (manifold) =>
            (manifold.entityA === floor && manifold.entityB === entity) ||
            (manifold.entityB === floor && manifold.entityA === entity),
        )
        .map((manifold) => manifold.depth),
    );
  }

  describe('two stacked boxes', () => {
    let bottom: Box;
    let top: Box;

    beforeEach(() => {
      bottom = addBox({ x: 0, y: -0.55 });
      top = addBox({ x: 0, y: -1.65 });
    });

    it('fall asleep on the same tick, soon after landing', () => {
      const ticks = tickUntilAsleep([bottom, top], 3 * ticksPerSecond);

      // A short fall and settle, then half a second of rest.
      expect(ticks).toBeGreaterThanOrEqual(ticksPerSecond / 2);
      expect(ticks).toBeLessThanOrEqual(2 * ticksPerSecond);
      expect(bottom.position.local.y).toBeCloseTo(-0.5, 1);
      expect(top.position.local.y).toBeCloseTo(-1.5, 1);
    });

    it('stay asleep without moving', () => {
      tickUntilAsleep([bottom, top], 3 * ticksPerSecond);

      const bottomPose = { ...bottom.position.local };
      const topPose = { ...top.position.local };
      const rotations = [bottom.rotation.local, top.rotation.local];

      for (let i = 0; i < 10 * ticksPerSecond; i++) {
        tick();

        expect(bottom.rigidBody.isSleeping).toBe(true);
        expect(top.rigidBody.isSleeping).toBe(true);
      }

      expect(bottom.position.local).toEqual(bottomPose);
      expect(top.position.local).toEqual(topPose);
      expect([bottom.rotation.local, top.rotation.local]).toEqual(rotations);
    });

    it('both wake on the tick after an impulse on the top box, then sleep again', () => {
      tickUntilAsleep([bottom, top], 3 * ticksPerSecond);

      applyImpulse(world, top.entity, { x: 0.5, y: 0 }, top.position.world);
      tick();

      expect(bottom.rigidBody.isSleeping).toBe(false);
      expect(top.rigidBody.isSleeping).toBe(false);

      tickUntilAsleep([bottom, top], 5 * ticksPerSecond);
    });

    it('wake the top box when the bottom one is removed, and it falls', () => {
      tickUntilAsleep([bottom, top], 3 * ticksPerSecond);

      world.removeEntity(bottom.entity);
      tick();

      expect(top.rigidBody.isSleeping).toBe(false);

      for (let i = 0; i < ticksPerSecond; i++) {
        tick();
      }

      expect(top.position.local.y).toBeCloseTo(-0.5, 1);
    });

    it('both rise when gravity reverses and one asks to wake', () => {
      tickUntilAsleep([bottom, top], 3 * ticksPerSecond);

      const bottomY = bottom.position.local.y;
      const topY = top.position.local.y;

      bottom.gravity.amount.y = -9.81;
      top.gravity.amount.y = -9.81;
      bottom.rigidBody.wakeRequested = true;
      tick();

      expect(bottom.rigidBody.velocity.y).toBeLessThan(0);
      expect(top.rigidBody.velocity.y).toBeLessThan(0);
      expect(bottom.position.local.y).toBeLessThan(bottomY);
      expect(top.position.local.y).toBeLessThan(topY);
    });

    it('stay asleep under reversed gravity without a wake request', () => {
      tickUntilAsleep([bottom, top], 3 * ticksPerSecond);

      bottom.gravity.amount.y = -9.81;
      top.gravity.amount.y = -9.81;

      for (let i = 0; i < ticksPerSecond; i++) {
        tick();
      }

      expect(bottom.rigidBody.isSleeping).toBe(true);
      expect(top.rigidBody.isSleeping).toBe(true);
    });
  });

  it('turns a sleeping box whose motor is re-targeted, and wakes it on the next tick', () => {
    const box = addBox({ x: 0, y: -0.55 });
    const motor = addAngularVelocityMotorComponent(world, box.entity, {
      targetVelocity: 0,
      maxTorque: 100,
    });

    tickUntilAsleep([box], 3 * ticksPerSecond);

    const restingRotation = box.rotation.local;

    motor.targetVelocity = 3;
    tick();

    // The motor's angular velocity disturbs the box, so integration turns
    // it on this tick, and the sleep system wakes it on the next.
    expect(box.rotation.local).not.toBe(restingRotation);
    expect(box.rigidBody.isSleeping).toBe(true);

    tick();

    expect(box.rigidBody.isSleeping).toBe(false);

    for (let i = 0; i < 10; i++) {
      tick();
    }

    // Once awake, the floor holds the turning box up.
    expect(floorPenetration(box.entity)).toBeLessThan(0.1);
  });

  it('puts a stack of five boxes to sleep within two seconds of landing', () => {
    const boxes = [0, 1, 2, 3, 4].map((i) =>
      addBox({ x: 0, y: -0.55 - i * 1.05 }),
    );

    // The top box lands within about half a second.
    const ticks = tickUntilAsleep(boxes, 3 * ticksPerSecond);

    expect(ticks).toBeLessThanOrEqual(2.5 * ticksPerSecond);
  });

  it('puts a pyramid of ten boxes to sleep within two seconds of landing', () => {
    const boxes: Box[] = [];

    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4 - row; column++) {
        boxes.push(
          addBox({
            x: column * 1.1 + row * 0.55,
            y: -0.55 - row * 1.05,
          }),
        );
      }
    }

    const ticks = tickUntilAsleep(boxes, 3 * ticksPerSecond);

    expect(ticks).toBeLessThanOrEqual(2.5 * ticksPerSecond);
  });
});
