import { beforeEach, describe, expect, it } from 'vitest';
import {
  Body,
  Bodies,
  Engine,
} from 'matter-js';
import { createPhysicsEcsSystem } from './physics.system';
import { EcsWorld } from '../../new-ecs';
import { PositionEcsComponent, positionId, RotationEcsComponent, rotationId, Time } from '../../common';
import { PhysicsBodyEcsComponent, PhysicsBodyId } from '../components';
import { Vector2 } from '../../math';

describe('PhysicsSystem', () => {
  let world: EcsWorld;
  let time: Time;
  let engine: Engine;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    engine = Engine.create({ gravity: { x: 0, y: 0 } });
    world.addSystem(createPhysicsEcsSystem(engine, time));
  });

  it('should update position and rotation from physics body for dynamic bodies', () => {
    const entity = world.createEntity();

    const physicsBody = Bodies.rectangle(100, 200, 50, 50, { isStatic: false });
    const physicsBodyComponent: PhysicsBodyEcsComponent = {
      physicsBody,
    };

    const positionComponent: PositionEcsComponent = {
      local: { x: 0, y: 0 },
      world: { x: 0, y: 0 },
    };

    const rotationComponent: RotationEcsComponent = {
      local: 0,
      world: 0,
    };

    world.addComponent(entity, PhysicsBodyId, physicsBodyComponent);
    world.addComponent(entity, positionId, positionComponent);
    world.addComponent(entity, rotationId, rotationComponent);

    time.update(16);
    world.update();

    expect(positionComponent.world.x).toBe(physicsBody.position.x);
    expect(positionComponent.world.y).toBe(physicsBody.position.y);
    expect(rotationComponent.world).toBe(physicsBody.angle);
  });

  it('should update physics body from position and rotation for static bodies', () => {
    const entity = world.createEntity();

    const physicsBody = Bodies.rectangle(0, 0, 50, 50, { isStatic: true });
    const physicsBodyComponent: PhysicsBodyEcsComponent = {
      physicsBody,
    };

    const positionComponent: PositionEcsComponent = {
      local: { x: 100, y: 200 },
      world: { x: 100, y: 200 },
    };

    const rotationComponent: RotationEcsComponent = {
      local: Math.PI / 4,
      world: Math.PI / 4,
    };

    world.addComponent(entity, PhysicsBodyId, physicsBodyComponent);
    world.addComponent(entity, positionId, positionComponent);
    world.addComponent(entity, rotationId, rotationComponent);

    time.update(16);
    world.update();

    expect(physicsBody.position.x).toBe(100);
    expect(physicsBody.position.y).toBe(200);
    expect(physicsBody.angle).toBe(Math.PI / 4);
  });

  it('should handle multiple physics bodies', () => {
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const body1 = Bodies.rectangle(50, 50, 30, 30, { isStatic: false });
    const body2 = Bodies.rectangle(150, 150, 40, 40, { isStatic: false });

    world.addComponent(entity1, PhysicsBodyId, { physicsBody: body1 });
    world.addComponent(entity1, positionId, {
      local: { x: 0, y: 0 },
      world: { x: 0, y: 0 },
    });
    world.addComponent(entity1, rotationId, { local: 0, world: 0 });

    world.addComponent(entity2, PhysicsBodyId, { physicsBody: body2 });
    world.addComponent(entity2, positionId, {
      local: { x: 0, y: 0 },
      world: { x: 0, y: 0 },
    });
    world.addComponent(entity2, rotationId, { local: 0, world: 0 });

    time.update(16);
    world.update();

    const pos1 = world.getComponent(entity1, positionId);
    const pos2 = world.getComponent(entity2, positionId);

    expect(pos1!.world.x).toBe(body1.position.x);
    expect(pos1!.world.y).toBe(body1.position.y);
    expect(pos2!.world.x).toBe(body2.position.x);
    expect(pos2!.world.y).toBe(body2.position.y);
  });

  it('should synchronize dynamic body position with ECS', () => {
    const entity = world.createEntity();

    const physicsBody = Bodies.rectangle(100, 200, 50, 50, { isStatic: false });
    
    world.addComponent(entity, PhysicsBodyId, { physicsBody });
    world.addComponent(entity, positionId, {
      local: Vector2.zero,
      world: Vector2.zero,
    });
    world.addComponent(entity, rotationId, { local: 0, world: 0 });

    time.update(16);
    world.update();

    const position = world.getComponent(entity, positionId);

    expect(position!.world.x).toBe(physicsBody.position.x);
    expect(position!.world.y).toBe(physicsBody.position.y);
  });
});
