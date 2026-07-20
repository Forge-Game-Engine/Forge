import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearSpringEcsSystem } from './linear-spring.system.js';
import { EcsWorld } from '../../ecs/index.js';
import { Time } from '../../common/index.js';
import { addLinearSpringComponent } from '../components/index.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const createBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position });

const createStaticBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position, isStatic: true });

describe('LinearSpringSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    world.addSystem(createLinearSpringEcsSystem(time));
  });

  it('pulls bodies together when stretched beyond restLength', () => {
    const entity = world.createEntity();
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(10, 0));

    addLinearSpringComponent(world, entity, {
      bodyA,
      bodyB,
      restLength: 5,
      stiffness: 10,
    });

    time.update(1000);
    world.update();

    expect(bodyB.velocity.x).toBeLessThan(0);
    expect(bodyB.velocity.y).toBeCloseTo(0);
  });

  it('pushes bodies apart when compressed below restLength', () => {
    const entity = world.createEntity();
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(2, 0));

    addLinearSpringComponent(world, entity, {
      bodyA,
      bodyB,
      restLength: 5,
      stiffness: 10,
    });

    time.update(1000);
    world.update();

    expect(bodyB.velocity.x).toBeGreaterThan(0);
  });

  it('applies no force when at restLength', () => {
    const entity = world.createEntity();
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));

    addLinearSpringComponent(world, entity, {
      bodyA,
      bodyB,
      restLength: 5,
      stiffness: 10,
    });

    time.update(1000);
    world.update();

    expect(bodyB.velocity.equals(Vector2.zero)).toBe(true);
  });

  it('applies equal and opposite impulses to both dynamic bodies', () => {
    const entity = world.createEntity();
    const bodyA = createBody(Vector2.zero);
    const bodyB = createBody(new Vector2(10, 0));

    addLinearSpringComponent(world, entity, {
      bodyA,
      bodyB,
      restLength: 5,
      stiffness: 10,
    });

    time.update(1000);
    world.update();

    expect(bodyA.velocity.x).toBeCloseTo(-bodyB.velocity.x);
  });

  it('has no effect on static bodies', () => {
    const entity = world.createEntity();
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createStaticBody(new Vector2(10, 0));

    addLinearSpringComponent(world, entity, {
      bodyA,
      bodyB,
      restLength: 5,
      stiffness: 10,
    });

    time.update(1000);

    expect(() => world.update()).not.toThrow();
    expect(bodyA.velocity.equals(Vector2.zero)).toBe(true);
    expect(bodyB.velocity.equals(Vector2.zero)).toBe(true);
  });

  it('scales the force by deltaTimeInSeconds', () => {
    const entity = world.createEntity();
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(10, 0));

    addLinearSpringComponent(world, entity, {
      bodyA,
      bodyB,
      restLength: 5,
      stiffness: 10,
    });

    time.update(500);
    world.update();

    const otherWorld = new EcsWorld();
    const otherTime = new Time();
    otherWorld.addSystem(createLinearSpringEcsSystem(otherTime));

    const otherEntity = otherWorld.createEntity();
    const bodyC = createBody(new Vector2(10, 0));

    addLinearSpringComponent(otherWorld, otherEntity, {
      bodyA: createStaticBody(Vector2.zero),
      bodyB: bodyC,
      restLength: 5,
      stiffness: 10,
    });

    otherTime.update(1000);
    otherWorld.update();

    expect(bodyC.velocity.x).toBeCloseTo(bodyB.velocity.x * 2);
  });
});
