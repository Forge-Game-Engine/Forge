import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearDamperEcsSystem } from './linear-damper.system.js';
import { EcsWorld } from '../../ecs/index.js';
import { Time } from '../../common/index.js';
import { addLinearDamperComponent } from '../components/index.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const createBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position });

const createStaticBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position, isStatic: true });

describe('LinearDamperSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    world.addSystem(createLinearDamperEcsSystem(time));
  });

  it('resists bodies moving apart (extension)', () => {
    const entity = world.createEntity();
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));
    bodyB.velocity = new Vector2(3, 0);

    addLinearDamperComponent(world, entity, {
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    time.update(1000);
    world.update();

    expect(bodyB.velocity.x).toBeLessThan(3);
  });

  it('resists bodies moving together (compression)', () => {
    const entity = world.createEntity();
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));
    bodyB.velocity = new Vector2(-3, 0);

    addLinearDamperComponent(world, entity, {
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    time.update(1000);
    world.update();

    expect(bodyB.velocity.x).toBeGreaterThan(-3);
  });

  it('ignores relative velocity perpendicular to the anchor line', () => {
    const entity = world.createEntity();
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));
    bodyB.velocity = new Vector2(0, 3);

    addLinearDamperComponent(world, entity, {
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    time.update(1000);
    world.update();

    expect(bodyB.velocity.y).toBeCloseTo(3);
  });

  it('applies no force when there is no relative velocity', () => {
    const entity = world.createEntity();
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));

    addLinearDamperComponent(world, entity, {
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    time.update(1000);
    world.update();

    expect(bodyB.velocity.equals(Vector2.zero)).toBe(true);
  });

  it('applies equal and opposite impulses to both dynamic bodies', () => {
    const entity = world.createEntity();
    const bodyA = createBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));
    bodyB.velocity = new Vector2(3, 0);

    addLinearDamperComponent(world, entity, {
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    time.update(1000);
    world.update();

    const changeInB = bodyB.velocity.x - 3;
    const changeInA = bodyA.velocity.x - 0;

    expect(changeInA).toBeCloseTo(-changeInB);
  });

  it('has no effect on static bodies', () => {
    const entity = world.createEntity();
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createStaticBody(new Vector2(5, 0));

    addLinearDamperComponent(world, entity, {
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    time.update(1000);

    expect(() => world.update()).not.toThrow();
    expect(bodyA.velocity.equals(Vector2.zero)).toBe(true);
    expect(bodyB.velocity.equals(Vector2.zero)).toBe(true);
  });
});
