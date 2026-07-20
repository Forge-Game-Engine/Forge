import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearSpringEcsSystem } from './linear-spring.system.js';
import { EcsWorld } from '../../ecs/index.js';
import { Time } from '../../common/index.js';
import {
  LinearSpringEcsComponent,
  LinearSpringId,
} from '../components/index.js';
import { LinearSpring } from '../forces/index.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

describe('LinearSpringSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    world.addSystem(createLinearSpringEcsSystem(time));
  });

  it("applies the spring's restoring force to its bodies every tick", () => {
    const entity = world.createEntity();
    const bodyA = new RigidBody({
      shape: new CircleShape(1),
      isStatic: true,
    });
    const bodyB = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(10, 0),
    });
    const spring = new LinearSpring({
      bodyA,
      bodyB,
      restLength: 5,
      stiffness: 10,
    });

    world.addComponent<LinearSpringEcsComponent>(entity, LinearSpringId, {
      spring,
    });

    time.update(500);
    world.update();

    expect(bodyB.velocity.x).toBeLessThan(0);
  });
});
