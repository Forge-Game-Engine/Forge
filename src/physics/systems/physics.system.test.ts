import { beforeEach, describe, expect, it } from 'vitest';
import { createPhysicsEcsSystem } from './physics.system.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '../../common/index.js';
import { PhysicsBodyEcsComponent, PhysicsBodyId } from '../components/index.js';
import { PhysicsWorld } from '../physics-world.js';
import { RigidBody } from '../rigid-body.js';
import { PolygonShape } from '../shapes/index.js';
import { Vector2 } from '../../math/index.js';

describe('PhysicsSystem', () => {
  let world: EcsWorld;
  let time: Time;
  let physicsWorld: PhysicsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    physicsWorld = new PhysicsWorld({ gravity: Vector2.zero });
    world.addSystem(createPhysicsEcsSystem(physicsWorld, time));
  });

  it('should update position and rotation from physics body for dynamic bodies', () => {
    const entity = world.createEntity();

    const physicsBody = new RigidBody({
      shape: PolygonShape.rectangle(50, 50),
      position: new Vector2(100, 200),
    });
    physicsBody.velocity = new Vector2(10, 0);

    const physicsBodyComponent: PhysicsBodyEcsComponent = {
      physicsBody,
    };

    const positionComponent: PositionEcsComponent = {
      local: Vector2.zero,
      world: Vector2.zero,
    };

    const rotationComponent: RotationEcsComponent = {
      local: 0,
      world: 0,
    };

    world.addComponent(entity, PhysicsBodyId, physicsBodyComponent);
    world.addComponent(entity, positionId, positionComponent);
    world.addComponent(entity, rotationId, rotationComponent);

    time.update(1000);
    world.update();

    expect(positionComponent.world.x).toBe(physicsBody.position.x);
    expect(positionComponent.world.y).toBe(physicsBody.position.y);
    expect(rotationComponent.world).toBe(-physicsBody.angle);
  });

  it('should update physics body from position and rotation for static bodies', () => {
    const entity = world.createEntity();

    const physicsBody = new RigidBody({
      shape: PolygonShape.rectangle(50, 50),
      isStatic: true,
    });

    const physicsBodyComponent: PhysicsBodyEcsComponent = {
      physicsBody,
    };

    const positionComponent: PositionEcsComponent = {
      local: new Vector2(100, 200),
      world: new Vector2(100, 200),
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
    expect(physicsBody.angle).toBe(-Math.PI / 4);
  });

  it('should update physics body from position and rotation for kinematic bodies', () => {
    const entity = world.createEntity();

    const physicsBody = new RigidBody({
      shape: PolygonShape.rectangle(50, 50),
      isStatic: false,
    });
    physicsBody.velocity = new Vector2(10, 0);

    const physicsBodyComponent: PhysicsBodyEcsComponent = {
      physicsBody,
      isKinematic: true,
    };

    const positionComponent: PositionEcsComponent = {
      local: new Vector2(100, 200),
      world: new Vector2(100, 200),
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
    expect(physicsBody.angle).toBe(-Math.PI / 4);
  });

  it('should handle multiple physics bodies', () => {
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const body1 = new RigidBody({
      shape: PolygonShape.rectangle(30, 30),
      position: new Vector2(50, 50),
    });
    const body2 = new RigidBody({
      shape: PolygonShape.rectangle(40, 40),
      position: new Vector2(150, 150),
    });

    world.addComponent(entity1, PhysicsBodyId, { physicsBody: body1 });
    world.addComponent(entity1, positionId, {
      local: Vector2.zero,
      world: Vector2.zero,
    });
    world.addComponent(entity1, rotationId, { local: 0, world: 0 });

    world.addComponent(entity2, PhysicsBodyId, { physicsBody: body2 });
    world.addComponent(entity2, positionId, {
      local: Vector2.zero,
      world: Vector2.zero,
    });
    world.addComponent(entity2, rotationId, { local: 0, world: 0 });

    time.update(16);
    world.update();

    const pos1 = world.getComponent(entity1, positionId);
    const pos2 = world.getComponent(entity2, positionId);

    expect(pos1).toBeDefined();
    expect(pos2).toBeDefined();

    if (pos1 && pos2) {
      expect(pos1.world.x).toBe(body1.position.x);
      expect(pos1.world.y).toBe(body1.position.y);
      expect(pos2.world.x).toBe(body2.position.x);
      expect(pos2.world.y).toBe(body2.position.y);
    }
  });

  it('should register a physics body on first update and remove it when the world stops', () => {
    const entity = world.createEntity();

    const physicsBody = new RigidBody({
      shape: PolygonShape.rectangle(50, 50),
      position: new Vector2(100, 200),
    });

    world.addComponent(entity, PhysicsBodyId, { physicsBody });
    world.addComponent(entity, positionId, {
      local: Vector2.zero,
      world: Vector2.zero,
    });
    world.addComponent(entity, rotationId, { local: 0, world: 0 });

    expect(physicsWorld.bodies).not.toContain(physicsBody);

    time.update(16);
    world.update();

    expect(physicsWorld.bodies).toContain(physicsBody);

    world.stop();

    expect(physicsWorld.bodies).not.toContain(physicsBody);
  });

  it('should add a physics body to the engine world once its entity appears in the query', () => {
    const entity = world.createEntity();
    const physicsBody = Bodies.circle(0, 0, 10, { isStatic: false });

    world.addComponent(entity, PhysicsBodyId, { physicsBody });
    world.addComponent(entity, positionId, {
      local: Vector2.zero,
      world: Vector2.zero,
    });
    world.addComponent(entity, rotationId, { local: 0, world: 0 });

    time.update(16);
    world.update();

    expect(Composite.allBodies(physicsWorld.engine.world)).toContain(
      physicsBody,
    );
  });

  it('should remove a physics body from the engine world after its entity is removed', () => {
    const entity = world.createEntity();
    const physicsBody = Bodies.circle(0, 0, 10, { isStatic: false });

    world.addComponent(entity, PhysicsBodyId, { physicsBody });
    world.addComponent(entity, positionId, {
      local: Vector2.zero,
      world: Vector2.zero,
    });
    world.addComponent(entity, rotationId, { local: 0, world: 0 });

    time.update(16);
    world.update();

    world.removeEntity(entity);

    time.update(16);
    world.update();

    expect(Composite.allBodies(physicsWorld.engine.world)).not.toContain(
      physicsBody,
    );
  });

  it('should drive a kinematic body from ECS position/rotation without the body driving ECS back', () => {
    const entity = world.createEntity();
    const physicsBody = Bodies.circle(0, 0, 10, {
      isStatic: false,
      isSensor: true,
    });

    const positionComponent: PositionEcsComponent = {
      local: new Vector2(50, 75),
      world: new Vector2(50, 75),
    };

    const rotationComponent: RotationEcsComponent = {
      local: 0.5,
      world: 0.5,
    };

    world.addComponent(entity, PhysicsBodyId, {
      physicsBody,
      isKinematic: true,
    });
    world.addComponent(entity, positionId, positionComponent);
    world.addComponent(entity, rotationId, rotationComponent);

    time.update(16);
    world.update();

    expect(physicsBody.position.x).toBe(50);
    expect(physicsBody.position.y).toBe(75);
    expect(physicsBody.angle).toBe(0.5);
    expect(positionComponent.world.x).toBe(50);
    expect(positionComponent.world.y).toBe(75);
  });

  it('should resolve collisionStart events to ECS entity pairs for overlapping kinematic bodies', () => {
    const entityA = world.createEntity();
    const entityB = world.createEntity();

    const bodyA = Bodies.circle(0, 0, 20, { isStatic: false, isSensor: true });
    const bodyB = Bodies.circle(10, 0, 20, {
      isStatic: false,
      isSensor: true,
    });

    world.addComponent(entityA, PhysicsBodyId, {
      physicsBody: bodyA,
      isKinematic: true,
    });
    world.addComponent(entityA, positionId, {
      local: new Vector2(0, 0),
      world: new Vector2(0, 0),
    });
    world.addComponent(entityA, rotationId, { local: 0, world: 0 });

    world.addComponent(entityB, PhysicsBodyId, {
      physicsBody: bodyB,
      isKinematic: true,
    });
    world.addComponent(entityB, positionId, {
      local: new Vector2(10, 0),
      world: new Vector2(10, 0),
    });
    world.addComponent(entityB, rotationId, { local: 0, world: 0 });

    time.update(16);
    world.update();

    expect(physicsWorld.collisionStarts).toHaveLength(1);

    const [pair] = physicsWorld.collisionStarts;
    const entities = [pair.entityA, pair.entityB].sort((a, b) => a - b);
    expect(entities).toEqual([entityA, entityB].sort((a, b) => a - b));
  });

  it('should resolve collisionEnd events to ECS entity pairs once kinematic bodies separate', () => {
    const entityA = world.createEntity();
    const entityB = world.createEntity();

    const bodyA = Bodies.circle(0, 0, 20, { isStatic: false, isSensor: true });
    const bodyB = Bodies.circle(10, 0, 20, {
      isStatic: false,
      isSensor: true,
    });

    world.addComponent(entityA, PhysicsBodyId, {
      physicsBody: bodyA,
      isKinematic: true,
    });
    world.addComponent(entityA, positionId, {
      local: new Vector2(0, 0),
      world: new Vector2(0, 0),
    });
    world.addComponent(entityA, rotationId, { local: 0, world: 0 });

    const positionComponentB: PositionEcsComponent = {
      local: new Vector2(10, 0),
      world: new Vector2(10, 0),
    };

    world.addComponent(entityB, PhysicsBodyId, {
      physicsBody: bodyB,
      isKinematic: true,
    });
    world.addComponent(entityB, positionId, positionComponentB);
    world.addComponent(entityB, rotationId, { local: 0, world: 0 });

    time.update(16);
    world.update();

    positionComponentB.world.x = 1000;

    time.update(16);
    world.update();

    expect(physicsWorld.collisionEnds).toHaveLength(1);

    const [pair] = physicsWorld.collisionEnds;
    const entities = [pair.entityA, pair.entityB].sort((a, b) => a - b);
    expect(entities).toEqual([entityA, entityB].sort((a, b) => a - b));
  });

  it('should not produce collision events between two overlapping static bodies', () => {
    const entityA = world.createEntity();
    const entityB = world.createEntity();

    const bodyA = Bodies.circle(0, 0, 20, { isStatic: true, isSensor: true });
    const bodyB = Bodies.circle(10, 0, 20, {
      isStatic: true,
      isSensor: true,
    });

    world.addComponent(entityA, PhysicsBodyId, { physicsBody: bodyA });
    world.addComponent(entityA, positionId, {
      local: new Vector2(0, 0),
      world: new Vector2(0, 0),
    });
    world.addComponent(entityA, rotationId, { local: 0, world: 0 });

    world.addComponent(entityB, PhysicsBodyId, { physicsBody: bodyB });
    world.addComponent(entityB, positionId, {
      local: new Vector2(10, 0),
      world: new Vector2(10, 0),
    });
    world.addComponent(entityB, rotationId, { local: 0, world: 0 });

    time.update(16);
    world.update();

    expect(physicsWorld.collisionStarts).toHaveLength(0);
  });
});
