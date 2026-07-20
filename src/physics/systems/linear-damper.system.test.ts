import { beforeEach, describe, expect, it } from 'vitest';
import { createLinearDamperEcsSystem } from './linear-damper.system.js';
import { EcsWorld } from '../../ecs/index.js';
import { Time } from '../../common/index.js';
import {
  LinearDamperEcsComponent,
  LinearDamperId,
} from '../components/index.js';
import { LinearDamper } from '../forces/index.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

describe('LinearDamperSystem', () => {
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    world.addSystem(createLinearDamperEcsSystem(time));
  });

  it("applies the damper's resistive force to its bodies every tick", () => {
    const entity = world.createEntity();
    const bodyA = new RigidBody({
      shape: new CircleShape(1),
      isStatic: true,
    });
    const bodyB = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(5, 0),
    });
    bodyB.velocity = new Vector2(3, 0);

    const damper = new LinearDamper({
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    world.addComponent<LinearDamperEcsComponent>(entity, LinearDamperId, {
      damper,
    });

    time.update(500);
    world.update();

    expect(bodyB.velocity.x).toBeLessThan(3);
  });
});
