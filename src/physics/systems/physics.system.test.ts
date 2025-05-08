import { beforeEach, describe, expect, it } from 'vitest';
import {
  Bodies,
  Body,
  Engine as MatterJsPhysicsEngine,
  World,
} from 'matter-js';
import { PhysicsSystem } from './physics.system';
import { Entity } from '../../ecs';
import { PositionComponent, RotationComponent, Time } from '../../common';
import { PhysicsBodyComponent } from '../components';

describe('PhysicsSystem', () => {
  let time: Time;
  let engine: MatterJsPhysicsEngine;
  let physicsSystem: PhysicsSystem;
  let entity: Entity;

  beforeEach(() => {
    time = new Time();

    time.update(16);
    engine = MatterJsPhysicsEngine.create();
    physicsSystem = new PhysicsSystem(time, engine);

    const physicsBody = Bodies.rectangle(0, 0, 10, 20);

    World.add(engine.world, [physicsBody]);

    entity = new Entity('box', [
      new PositionComponent(0, 0),
      new RotationComponent(0),
      new PhysicsBodyComponent(physicsBody),
    ]);
  });

  it('should update entity position and rotation in run', () => {
    const { physicsBody } = entity.getComponentRequired<PhysicsBodyComponent>(
      PhysicsBodyComponent.symbol,
    );
    const positionComponent = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );
    const rotationComponent = entity.getComponentRequired<RotationComponent>(
      RotationComponent.symbol,
    );

    Body.applyForce(physicsBody, { x: -10, y: -20 }, { x: 0.1, y: 0.1 });

    physicsSystem.beforeAll([entity]);
    physicsSystem.run(entity);

    expect(physicsBody.position.y).toBe(128.256);
    expect(positionComponent.x).toBe(128);
    expect(positionComponent.y).toBe(128.256);
    expect(rotationComponent.radians).toBeCloseTo(7.68);
  });
});
