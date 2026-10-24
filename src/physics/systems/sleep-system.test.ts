import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  PositionEcsComponent,
  RotationEcsComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import {
  addAngularVelocityMotorComponent,
  AngularVelocityMotorEcsComponent,
} from '../components/angular-velocity-motor-component.js';
import { addColliderComponent } from '../components/collider-component.js';
import { addLinearDamperComponent } from '../components/linear-damper-component.js';
import {
  addLinearSpringComponent,
  linearSpringId,
} from '../components/linear-spring-component.js';
import { addPrismaticJointComponent } from '../components/prismatic-joint-component.js';
import { addRevoluteJointComponent } from '../components/revolute-joint-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
  RigidBodyOptions,
} from '../components/rigidbody-component.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { createSleepEcsSystem, SleepOptions } from './sleep-system.js';

// A sixteenth of a second sums exactly in floating point, so eight ticks are
// exactly the default `restDuration` of half a second.
const tickMilliseconds = 62.5;
const ticksToSleep = 8;

interface TestBody {
  entity: number;
  rigidBody: RigidBodyEcsComponent;
  position: PositionEcsComponent;
  rotation: RotationEcsComponent;
}

describe('createSleepEcsSystem', () => {
  let world: EcsWorld;
  let time: Time;
  let manifolds: CollisionManifold[];

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    time.update(0);
    manifolds = [];
  });

  function addSleepSystem(options: Partial<SleepOptions> = {}): void {
    world.addSystem(createSleepEcsSystem(manifolds, time, options));
  }

  function tick(count = 1): void {
    for (let i = 0; i < count; i++) {
      time.update(time.rawTimeInMilliseconds + tickMilliseconds);
      world.update();
    }
  }

  function pausedTick(): void {
    time.update(time.rawTimeInMilliseconds);
    world.update();
  }

  function addBody(options: RigidBodyOptions = {}): TestBody {
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity);
    const rotation = addRotationComponent(world, entity);

    addColliderComponent(world, entity, { collider: new CircleCollider(1) });

    const rigidBody = addRigidBodyComponent(world, entity, options);

    return { entity, rigidBody, position, rotation };
  }

  /** A collider-only entity, static by convention, such as a floor. */
  function addStaticCollider(): number {
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addRotationComponent(world, entity);
    addColliderComponent(world, entity, { collider: new CircleCollider(1) });

    return entity;
  }

  function contact(entityA: number, entityB: number): CollisionManifold {
    return {
      entityA,
      entityB,
      normal: { x: 0, y: 1 },
      depth: 0,
      contactPoints: [],
      featureIds: [],
    };
  }

  function setContacts(...pairs: [number, number][]): void {
    manifolds.length = 0;
    manifolds.push(...pairs.map(([a, b]) => contact(a, b)));
  }

  function sleepingStates(...bodies: TestBody[]): boolean[] {
    return bodies.map((body) => body.rigidBody.isSleeping);
  }

  beforeEach(() => {
    addSleepSystem();
  });

  describe('falling asleep', () => {
    it('puts a resting body to sleep after restDuration and not a tick before', () => {
      const body = addBody();

      tick(ticksToSleep - 1);

      expect(body.rigidBody.isSleeping).toBe(false);
      expect(body.rigidBody.restTime).toBe(
        ((ticksToSleep - 1) * tickMilliseconds) / 1000,
      );

      tick();

      expect(body.rigidBody.isSleeping).toBe(true);
    });

    it('puts two touching bodies to sleep on the same tick, after the later one rests', () => {
      const bottom = addBody();
      const top = addBody({ velocity: { x: 1, y: 0 } });

      setContacts([bottom.entity, top.entity]);

      tick(3);
      top.rigidBody.velocity.x = 0;

      tick(ticksToSleep - 1);

      expect(sleepingStates(bottom, top)).toEqual([false, false]);
      expect(bottom.rigidBody.restTime).toBeGreaterThan(top.rigidBody.restTime);

      tick();

      expect(sleepingStates(bottom, top)).toEqual([true, true]);
    });

    it('zeroes resting velocities and records the pose and sorted links', () => {
      const body = addBody({
        velocity: { x: 0.005, y: -0.005 },
        angularVelocity: 0.01,
      });
      const later = addStaticCollider();
      const earlier = addStaticCollider();

      body.position.local = { x: 3, y: 4 };
      body.rotation.local = 1.25;
      setContacts(
        [later, body.entity],
        [body.entity, earlier],
        [body.entity, later],
      );

      tick(ticksToSleep);

      expect(body.rigidBody.isSleeping).toBe(true);
      expect(body.rigidBody.velocity).toEqual({ x: 0, y: 0 });
      expect(body.rigidBody.angularVelocity).toBe(0);
      expect(body.rigidBody.sleepRecord).toEqual({
        position: { x: 3, y: 4 },
        rotation: 1.25,
        links: [earlier, later].sort((a, b) => a - b),
      });
      expect(body.rigidBody.sleepRecord!.position).not.toBe(
        body.position.local,
      );
    });

    it('keeps a moving body and its whole island awake', () => {
      const resting = addBody();
      const moving = addBody({ velocity: { x: 0, y: 1 } });

      setContacts([resting.entity, moving.entity]);

      tick(ticksToSleep * 3);

      expect(sleepingStates(resting, moving)).toEqual([false, false]);
      expect(moving.rigidBody.restTime).toBe(0);
    });

    it('keeps an island with a body that cannot sleep awake', () => {
      const resting = addBody();
      const player = addBody({ canSleep: false });

      setContacts([resting.entity, player.entity]);

      tick(ticksToSleep * 3);

      expect(sleepingStates(resting, player)).toEqual([false, false]);
      expect(player.rigidBody.restTime).toBe(0);
    });

    it('does not count time or put bodies to sleep while paused', () => {
      const body = addBody();

      tick(ticksToSleep - 1);
      const restTime = body.rigidBody.restTime;

      for (let i = 0; i < 20; i++) {
        pausedTick();
      }

      expect(body.rigidBody.restTime).toBe(restTime);
      expect(body.rigidBody.isSleeping).toBe(false);

      tick();

      expect(body.rigidBody.isSleeping).toBe(true);
    });
  });

  describe('waking', () => {
    function addSleepingStack(): [TestBody, TestBody] {
      const bottom = addBody();
      const top = addBody();

      setContacts([bottom.entity, top.entity]);
      tick(ticksToSleep);

      expect(sleepingStates(bottom, top)).toEqual([true, true]);

      return [bottom, top];
    }

    it.each<[string, (body: TestBody) => void]>([
      ['velocity', (body) => (body.rigidBody.velocity.x = 2)],
      ['angularVelocity', (body) => (body.rigidBody.angularVelocity = -1)],
      ['position.local', (body) => (body.position.local.y += 0.5)],
      ['rotation.local', (body) => (body.rotation.local += 0.1)],
      ['canSleep', (body) => (body.rigidBody.canSleep = false)],
      ['wakeRequested', (body) => (body.rigidBody.wakeRequested = true)],
    ])(
      'wakes every member of an island when one member’s %s is written',
      (_name, disturb) => {
        const [bottom, top] = addSleepingStack();

        disturb(top);
        tick();

        expect(sleepingStates(bottom, top)).toEqual([false, false]);
        expect(bottom.rigidBody.sleepRecord).toBeNull();
        expect(top.rigidBody.sleepRecord).toBeNull();
        // Restarted at 0 when woken, then this tick's rest counted.
        expect(bottom.rigidBody.restTime).toBe(tickMilliseconds / 1000);
      },
    );

    it('keeps a woken island awake for restDuration again', () => {
      const [bottom, top] = addSleepingStack();

      top.position.local.x += 1;
      tick(ticksToSleep - 1);

      expect(sleepingStates(bottom, top)).toEqual([false, false]);

      tick();

      expect(sleepingStates(bottom, top)).toEqual([true, true]);
    });

    it('wakes a sleeping island an awake dynamic body touches', () => {
      const [bottom, top] = addSleepingStack();
      const ball = addBody({ velocity: { x: 0, y: 5 } });

      setContacts([bottom.entity, top.entity], [top.entity, ball.entity]);
      tick();

      expect(sleepingStates(bottom, top)).toEqual([false, false]);
    });

    it('wakes a sleeping body a moving kinematic body touches, and not one a still kinematic body touches', () => {
      const platform = addBody({ type: 'kinematic' });
      const crate = addBody();

      setContacts([platform.entity, crate.entity]);
      tick(ticksToSleep);

      expect(crate.rigidBody.isSleeping).toBe(true);

      tick(ticksToSleep);

      expect(crate.rigidBody.isSleeping).toBe(true);

      platform.rigidBody.velocity.x = 1;
      tick();

      expect(crate.rigidBody.isSleeping).toBe(false);
    });

    it('keeps two bodies on the same static floor in separate islands', () => {
      const floor = addStaticCollider();
      const left = addBody();
      const right = addBody();

      setContacts([floor, left.entity], [right.entity, floor]);
      tick(ticksToSleep);

      expect(sleepingStates(left, right)).toEqual([true, true]);

      left.rigidBody.velocity.x = 1;
      tick();

      expect(sleepingStates(left, right)).toEqual([false, true]);
    });

    it('wakes a sleeping body that touches a new static collider', () => {
      const body = addBody();

      tick(ticksToSleep);

      expect(body.rigidBody.isSleeping).toBe(true);

      setContacts([addStaticCollider(), body.entity]);
      tick();

      expect(body.rigidBody.isSleeping).toBe(false);
    });

    it('wakes the rest of an island when one member is removed', () => {
      const floor = addStaticCollider();
      const bottom = addBody();
      const top = addBody();

      setContacts([floor, bottom.entity], [bottom.entity, top.entity]);
      tick(ticksToSleep);

      world.removeEntity(bottom.entity);
      setContacts();
      tick();

      expect(top.rigidBody.isSleeping).toBe(false);
    });

    it('wakes the bodies on a removed floor', () => {
      const floor = addStaticCollider();
      const body = addBody();

      setContacts([floor, body.entity]);
      tick(ticksToSleep);

      world.removeEntity(floor);
      setContacts();
      tick();

      expect(body.rigidBody.isSleeping).toBe(false);
    });

    it('wakes the bodies touching a sleeping body whose type changed, and clears its isSleeping', () => {
      const [bottom, top] = addSleepingStack();

      bottom.rigidBody.type = 'kinematic';
      tick();

      expect(bottom.rigidBody.isSleeping).toBe(false);
      expect(bottom.rigidBody.sleepRecord).toBeNull();
      expect(top.rigidBody.isSleeping).toBe(false);
    });
  });

  describe('wake requests', () => {
    it('clears a request on an awake body and restarts its island’s rest time', () => {
      const bottom = addBody();
      const top = addBody();

      setContacts([bottom.entity, top.entity]);
      tick(ticksToSleep - 1);

      bottom.rigidBody.wakeRequested = true;
      tick();

      expect(bottom.rigidBody.wakeRequested).toBe(false);
      expect(sleepingStates(bottom, top)).toEqual([false, false]);
      expect(top.rigidBody.restTime).toBe(tickMilliseconds / 1000);

      tick(ticksToSleep - 1);

      expect(sleepingStates(bottom, top)).toEqual([true, true]);
    });

    it('wakes the sleeping bodies touching a kinematic body with a request', () => {
      const platform = addBody({ type: 'kinematic' });
      const crate = addBody();

      setContacts([crate.entity, platform.entity]);
      tick(ticksToSleep);

      platform.rigidBody.wakeRequested = true;
      tick();

      expect(platform.rigidBody.wakeRequested).toBe(false);
      expect(crate.rigidBody.isSleeping).toBe(false);
    });

    it('wakes and clears a request while paused', () => {
      const body = addBody();

      tick(ticksToSleep);

      body.rigidBody.wakeRequested = true;
      pausedTick();

      expect(body.rigidBody.wakeRequested).toBe(false);
      expect(body.rigidBody.isSleeping).toBe(false);
      expect(body.rigidBody.restTime).toBe(0);
    });

    it('wakes a disturbed island while paused', () => {
      const body = addBody();

      tick(ticksToSleep);

      body.rigidBody.velocity.y = 1;
      pausedTick();

      expect(body.rigidBody.isSleeping).toBe(false);
    });
  });

  describe('canSleep', () => {
    it('wakes a sleeping island when set to false', () => {
      const bottom = addBody();
      const top = addBody();

      setContacts([bottom.entity, top.entity]);
      tick(ticksToSleep);

      bottom.rigidBody.canSleep = false;
      tick(ticksToSleep * 2);

      expect(sleepingStates(bottom, top)).toEqual([false, false]);
    });
  });

  describe('joints', () => {
    const jointCases: [string, (a: number, b: number) => number][] = [
      [
        'revolute joint',
        (a, b): number => {
          const joint = world.createEntity();

          addRevoluteJointComponent(world, joint, { entityA: a, entityB: b });

          return joint;
        },
      ],
      [
        'prismatic joint',
        (a, b): number => {
          const joint = world.createEntity();

          addPrismaticJointComponent(world, joint, { entityA: a, entityB: b });

          return joint;
        },
      ],
      [
        'linear spring',
        (a, b): number => {
          const joint = world.createEntity();

          addLinearSpringComponent(world, joint, {
            entityA: a,
            entityB: b,
            stiffness: 10,
          });

          return joint;
        },
      ],
      [
        'linear damper',
        (a, b): number => {
          const joint = world.createEntity();

          addLinearDamperComponent(world, joint, {
            entityA: a,
            entityB: b,
            dampingCoefficient: 1,
          });

          return joint;
        },
      ],
    ];

    it.each(jointCases)('links two bodies with a %s', (_name, connect) => {
      const a = addBody();
      const b = addBody();
      const joint = connect(a.entity, b.entity);

      tick(ticksToSleep);

      expect(sleepingStates(a, b)).toEqual([true, true]);
      expect(a.rigidBody.sleepRecord!.links).toEqual([joint]);

      a.rigidBody.velocity.x = 1;
      tick();

      expect(sleepingStates(a, b)).toEqual([false, false]);
    });

    it('does not link bodies through a joint to a static anchor', () => {
      const anchor = addStaticCollider();
      const left = addBody();
      const right = addBody();

      addRevoluteJointComponent(world, world.createEntity(), {
        entityA: anchor,
        entityB: left.entity,
      });
      addRevoluteJointComponent(world, world.createEntity(), {
        entityA: anchor,
        entityB: right.entity,
      });
      tick(ticksToSleep);

      left.rigidBody.velocity.x = 1;
      tick();

      expect(sleepingStates(left, right)).toEqual([false, true]);
    });

    it('puts a pendulum hung from a static pivot to sleep', () => {
      const pivot = addStaticCollider();
      const bob = addBody();
      const joint = world.createEntity();

      addRevoluteJointComponent(world, joint, {
        entityA: pivot,
        entityB: bob.entity,
      });
      tick(ticksToSleep);

      expect(bob.rigidBody.isSleeping).toBe(true);
      expect(bob.rigidBody.sleepRecord!.links).toEqual([joint]);
    });

    it('wakes a sleeping body a joint is added to', () => {
      const anchor = addStaticCollider();
      const body = addBody();

      tick(ticksToSleep);
      addRevoluteJointComponent(world, world.createEntity(), {
        entityA: anchor,
        entityB: body.entity,
      });
      tick();

      expect(body.rigidBody.isSleeping).toBe(false);
    });

    it('wakes both bodies when their joint loses its component', () => {
      const a = addBody();
      const b = addBody();
      const joint = jointCases[2][1](a.entity, b.entity);

      tick(ticksToSleep);
      world.removeComponent(joint, linearSpringId);
      tick();

      expect(sleepingStates(a, b)).toEqual([false, false]);
    });

    it('does not count a joint whose other entity has no rotation as a link', () => {
      const body = addBody();
      const other = world.createEntity();

      addPositionComponent(world, other);
      addLinearDamperComponent(world, world.createEntity(), {
        entityA: body.entity,
        entityB: other,
        dampingCoefficient: 1,
      });
      tick(ticksToSleep);

      expect(body.rigidBody.sleepRecord!.links).toEqual([]);
    });

    it('wakes both bodies when their joint is removed', () => {
      const a = addBody();
      const b = addBody();
      const joint = jointCases[0][1](a.entity, b.entity);

      tick(ticksToSleep);
      world.removeEntity(joint);
      tick();

      expect(sleepingStates(a, b)).toEqual([false, false]);
    });

    it('wakes a body whose jointed partner is removed', () => {
      const a = addBody();
      const b = addBody();

      jointCases[0][1](a.entity, b.entity);
      tick(ticksToSleep);
      world.removeEntity(b.entity);
      tick();

      expect(a.rigidBody.isSleeping).toBe(false);
    });
  });

  describe('motors', () => {
    function addMotor(
      body: TestBody,
      targetVelocity: number,
      maxTorque = 10,
    ): AngularVelocityMotorEcsComponent {
      return addAngularVelocityMotorComponent(world, body.entity, {
        targetVelocity,
        maxTorque,
      });
    }

    // Without a motor system, the motor never turns its body, like a wheel
    // stalled against a wall.
    it('keeps a stalled body with a non-zero target and its island awake', () => {
      const wheel = addBody();
      const partner = addBody();

      setContacts([wheel.entity, partner.entity]);
      addMotor(wheel, 3);
      tick(4 * ticksToSleep);

      expect(sleepingStates(wheel, partner)).toEqual([false, false]);
      expect(wheel.rigidBody.restTime).toBe(0);
    });

    it('lets a body with a target of 0 fall asleep', () => {
      const wheel = addBody();

      addMotor(wheel, 0);
      tick(ticksToSleep);

      expect(wheel.rigidBody.isSleeping).toBe(true);
    });

    it.each<[string, RigidBodyOptions, number]>([
      ['fixed-rotation body', { fixedRotation: true }, 10],
      ['motor with no maxTorque', {}, 0],
    ])(
      'lets a body fall asleep when its motor cannot turn it: %s',
      (_name, options, maxTorque) => {
        const body = addBody(options);

        addMotor(body, 3, maxTorque);
        tick(ticksToSleep);

        expect(body.rigidBody.isSleeping).toBe(true);
      },
    );

    it('wakes a sleeping island when a motor target is set', () => {
      const wheel = addBody();
      const partner = addBody();

      setContacts([wheel.entity, partner.entity]);

      const motor = addMotor(wheel, 0);

      tick(ticksToSleep);

      expect(sleepingStates(wheel, partner)).toEqual([true, true]);

      motor.targetVelocity = 3;
      tick();

      expect(sleepingStates(wheel, partner)).toEqual([false, false]);
      expect(partner.rigidBody.restTime).toBe(tickMilliseconds / 1000);
    });

    it('wakes a sleeping island when a motor target is set while paused', () => {
      const wheel = addBody();
      const motor = addMotor(wheel, 0);

      tick(ticksToSleep);
      motor.targetVelocity = -3;
      pausedTick();

      expect(wheel.rigidBody.isSleeping).toBe(false);
    });

    it('lets a body fall asleep once its motor target is set back to 0', () => {
      const wheel = addBody();
      const motor = addMotor(wheel, 3);

      tick(ticksToSleep);
      motor.targetVelocity = 0;
      tick(ticksToSleep - 1);

      expect(wheel.rigidBody.isSleeping).toBe(false);

      tick();

      expect(wheel.rigidBody.isSleeping).toBe(true);
    });
  });

  describe('bodies that are not dynamic', () => {
    it.each(['kinematic', 'static'] as const)(
      'never puts a %s body to sleep',
      (type) => {
        const body = addBody({ type });

        tick(ticksToSleep * 3);

        expect(body.rigidBody.isSleeping).toBe(false);
        expect(body.rigidBody.restTime).toBe(0);
      },
    );
  });

  describe('bodies created asleep', () => {
    it('keeps a body created asleep asleep and records it on the first tick', () => {
      const body = addBody({ isSleeping: true });

      body.position.local = { x: 2, y: 1 };
      tick();

      expect(body.rigidBody.isSleeping).toBe(true);
      expect(body.rigidBody.sleepRecord).toEqual({
        position: { x: 2, y: 1 },
        rotation: 0,
        links: [],
      });
    });

    it('treats two touching bodies created asleep as one island', () => {
      const bottom = addBody({ isSleeping: true });
      const top = addBody({ isSleeping: true });

      setContacts([bottom.entity, top.entity]);
      tick();

      expect(sleepingStates(bottom, top)).toEqual([true, true]);

      top.rigidBody.velocity.y = -1;
      tick();

      expect(sleepingStates(bottom, top)).toEqual([false, false]);
    });

    it('wakes a body created asleep that touches an awake body', () => {
      const crate = addBody({ isSleeping: true });
      const ball = addBody({ velocity: { x: 1, y: 0 } });

      setContacts([crate.entity, ball.entity]);
      tick();

      expect(crate.rigidBody.isSleeping).toBe(false);
    });
  });

  describe('options', () => {
    it.each([
      [0.009, true],
      [0.011, false],
    ])(
      'by default, counts a body moving at %f units a second as resting: %s',
      (speed, rests) => {
        const body = addBody({ velocity: { x: speed, y: 0 } });

        tick(ticksToSleep);

        expect(body.rigidBody.isSleeping).toBe(rests);
      },
    );

    it('uses the resting speeds and duration it is given', () => {
      world = new EcsWorld();
      addSleepSystem({
        maxRestingSpeed: 1,
        maxRestingAngularSpeed: 1,
        restDuration: 0.25,
      });

      const body = addBody({
        velocity: { x: 0.9, y: 0 },
        angularVelocity: 0.9,
      });

      tick(ticksToSleep / 2);

      expect(body.rigidBody.isSleeping).toBe(true);
    });

    it.each(['maxRestingSpeed', 'maxRestingAngularSpeed', 'restDuration'])(
      'throws for a negative or non-finite %s',
      (name) => {
        for (const value of [-1, Number.NaN, Infinity]) {
          expect(() =>
            createSleepEcsSystem(manifolds, time, { [name]: value }),
          ).toThrow(new RegExp(name));
        }
      },
    );
  });
});
