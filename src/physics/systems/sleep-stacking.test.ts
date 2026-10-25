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
import {
  addColliderComponent,
  allCollisionCategories,
} from '../components/collider-component.js';
import {
  addGravityComponent,
  GravityEcsComponent,
} from '../components/gravity-component.js';
import {
  addRevoluteJointComponent,
  RevoluteJointEcsComponent,
} from '../components/revolute-joint-component.js';
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
import { createRevoluteJointEcsSystem } from './revolute-joint-system.js';
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

    world.addSystem(createTransformEcsSystem(time));
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
    world.addSystem(createRevoluteJointEcsSystem(time));
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

  function addBox(
    center: Vector2,
    { width = 1, height = 1, mask = allCollisionCategories } = {},
  ): Box {
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, { local: center });
    const rotation = addRotationComponent(world, entity);

    addColliderComponent(world, entity, {
      collider: boxCollider(width, height),
      restitution: 0,
      mask,
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

      applyImpulse(world, top.entity, { x: 0.5, y: 0 }, top.position.local);
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

  it('wakes a sleeping box whose motor is re-targeted on the same tick, and turns it with its contacts solved', () => {
    const box = addBox({ x: 0, y: -0.55 });
    const motor = addAngularVelocityMotorComponent(world, box.entity, {
      targetVelocity: 0,
      maxTorque: 100,
    });

    tickUntilAsleep([box], 3 * ticksPerSecond);

    const restingRotation = box.rotation.local;

    motor.targetVelocity = 3;
    tick();

    expect(box.rigidBody.isSleeping).toBe(false);
    expect(box.rotation.local).not.toBe(restingRotation);

    for (let i = 0; i < 10; i++) {
      tick();

      expect(floorPenetration(box.entity)).toBeLessThan(0.1);
    }
  });

  it('keeps a box whose motor is too weak to tip it awake', () => {
    const box = addBox({ x: 0, y: -0.55 });

    // Far less torque than tipping the box over takes, so the motor stalls
    // and the box only ever turns a tiny amount each tick.
    addAngularVelocityMotorComponent(world, box.entity, {
      targetVelocity: 3,
      maxTorque: 0.01,
    });

    for (let i = 0; i < 5 * ticksPerSecond; i++) {
      tick();

      expect(box.rigidBody.isSleeping).toBe(false);
    }

    expect(Math.abs(box.rotation.local)).toBeLessThan(0.1);
  });

  describe('a chain of links hung from a static pivot by revolute joints', () => {
    const linkCount = 4;
    const linkLength = 1;
    let links: Box[];
    let joints: { entity: number; joint: RevoluteJointEcsComponent }[];

    beforeEach(() => {
      // The pivot sits high above the floor, so the chain hangs freely.
      const pivot = world.createEntity();

      addPositionComponent(world, pivot, { local: { x: 0, y: -10 } });
      addRotationComponent(world, pivot);

      links = [];
      joints = [];

      for (let i = 0; i < linkCount; i++) {
        const link = addBox(
          { x: 0, y: -10 + (i + 0.5) * linkLength },
          { width: 0.2, height: linkLength, mask: 0 },
        );
        const entity = world.createEntity();
        const joint = addRevoluteJointComponent(world, entity, {
          entityA: i === 0 ? pivot : links[i - 1].entity,
          entityB: link.entity,
          localAnchorA: i === 0 ? { x: 0, y: 0 } : { x: 0, y: linkLength / 2 },
          localAnchorB: { x: 0, y: -linkLength / 2 },
        });

        links.push(link);
        joints.push({ entity, joint });
      }
    });

    it('falls asleep on the same tick and stays asleep with no joint correction', () => {
      tickUntilAsleep(links, 5 * ticksPerSecond);

      const poses = links.map((link) => ({ ...link.position.local }));
      const rotations = links.map((link) => link.rotation.local);
      const impulses = joints.map(({ joint }) => ({
        ...joint.accumulatedPointImpulse,
      }));

      for (let i = 0; i < 5 * ticksPerSecond; i++) {
        tick();

        for (const link of links) {
          expect(link.rigidBody.isSleeping).toBe(true);
          expect(link.rigidBody.velocity).toEqual({ x: 0, y: 0 });
        }
      }

      expect(links.map((link) => link.position.local)).toEqual(poses);
      expect(links.map((link) => link.rotation.local)).toEqual(rotations);
      expect(joints.map(({ joint }) => joint.accumulatedPointImpulse)).toEqual(
        impulses,
      );
    });

    it('wakes as a whole when an impulse hits one link', () => {
      tickUntilAsleep(links, 5 * ticksPerSecond);

      const middle = links[2];

      applyImpulse(
        world,
        middle.entity,
        { x: 0.1, y: 0 },
        middle.position.local,
      );
      tick();

      expect(links.map((link) => link.rigidBody.isSleeping)).toEqual(
        links.map(() => false),
      );
    });

    it('wakes as a whole when a joint is removed', () => {
      tickUntilAsleep(links, 5 * ticksPerSecond);

      world.removeEntity(joints[2].entity);
      tick();

      expect(links.map((link) => link.rigidBody.isSleeping)).toEqual(
        links.map(() => false),
      );
    });
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
