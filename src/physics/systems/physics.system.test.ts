import { beforeEach, describe, expect, it } from 'vitest';
import {
  Bodies,
  Body,
  Engine as MatterJsPhysicsEngine,
  World as MatterJsWorld,
} from 'matter-js';
import { PhysicsSystem } from './physics.system';
import { Entity, World } from 'forge/ecs';
import { PositionComponent, RotationComponent, Time } from 'forge/common';
import { PhysicsBodyComponent } from 'forge/physics/components';
import { degreesToRadians } from 'forge/math';

describe('PhysicsSystem', () => {
  let time: Time;
  let engine: MatterJsPhysicsEngine;
  let physicsSystem: PhysicsSystem;
  let entity: Entity;
  let world: World;

  beforeEach(() => {
    world = new World('test-world');
    time = new Time();

    time.update(16);
    engine = MatterJsPhysicsEngine.create();
    physicsSystem = new PhysicsSystem(time, engine);

    const physicsBody = Bodies.rectangle(0, 0, 10, 20);

    MatterJsWorld.add(engine.world, [physicsBody]);

    entity = new Entity('box', world, [
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
    expect(positionComponent.world.x).toBe(128);
    expect(positionComponent.world.y).toBe(128.256);
    expect(rotationComponent.world).toBeCloseTo(7.68);
  });

  it('should sync static body position and angle from components', () => {
    // Create a static body and entity
    const staticBody = Bodies.rectangle(5, 10, 10, 10, { isStatic: true });
    staticBody.angle = 0.5;
    const staticEntity = new Entity('static', world, [
      new PositionComponent(42, 99),
      new RotationComponent(degreesToRadians(90)),
      new PhysicsBodyComponent(staticBody),
    ]);

    // Run system
    physicsSystem.run(staticEntity);

    // The body should be updated from the components
    expect(staticBody.position.x).toBe(42);
    expect(staticBody.position.y).toBe(99);
    expect(staticBody.angle).toBe(degreesToRadians(90));
  });
});
