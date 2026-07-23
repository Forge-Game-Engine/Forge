import { beforeEach, describe, expect, it } from 'vitest';
import { createPhysicsSyncEcsSystem } from './physics-sync.system.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  addPositionComponent,
  addRotationComponent,
  positionId,
  Time,
} from '../../common/index.js';
import { addPhysicsBodyComponent } from '../components/index.js';
import { PhysicsWorld } from '../physics-world.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape, PolygonShape } from '../shapes/index.js';
import { Vector2 } from '../../math/index.js';

describe('PhysicsSyncSystem', () => {
  let world: EcsWorld;
  let time: Time;
  let physicsWorld: PhysicsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    time = new Time();
    physicsWorld = new PhysicsWorld({ gravity: Vector2.zero });
    world.addSystem(createPhysicsSyncEcsSystem(physicsWorld, time));
  });

  it('should update position and rotation from physics body for dynamic bodies', () => {
    const entity = world.createEntity();

    const physicsBody = new RigidBody({
      shape: PolygonShape.rectangle(50, 50),
      position: new Vector2(100, 200),
    });
    physicsBody.velocity = new Vector2(10, 0);

    addPhysicsBodyComponent(world, entity, { physicsBody });

    const positionComponent = addPositionComponent(world, entity);
    const rotationComponent = addRotationComponent(world, entity);

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

    addPhysicsBodyComponent(world, entity, { physicsBody });
    addPositionComponent(world, entity, {
      local: new Vector2(100, 200),
      world: new Vector2(100, 200),
    });
    addRotationComponent(world, entity, {
      local: Math.PI / 4,
      world: Math.PI / 4,
    });

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

    addPhysicsBodyComponent(world, entity, { physicsBody, isKinematic: true });
    addPositionComponent(world, entity, {
      local: new Vector2(100, 200),
      world: new Vector2(100, 200),
    });
    addRotationComponent(world, entity, {
      local: Math.PI / 4,
      world: Math.PI / 4,
    });

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

    addPhysicsBodyComponent(world, entity1, { physicsBody: body1 });
    addPositionComponent(world, entity1);
    addRotationComponent(world, entity1);

    addPhysicsBodyComponent(world, entity2, { physicsBody: body2 });
    addPositionComponent(world, entity2);
    addRotationComponent(world, entity2);

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

    addPhysicsBodyComponent(world, entity, { physicsBody });
    addPositionComponent(world, entity);
    addRotationComponent(world, entity);

    expect(physicsWorld.bodies).not.toContain(physicsBody);

    time.update(16);
    world.update();

    expect(physicsWorld.bodies).toContain(physicsBody);

    world.stop();

    expect(physicsWorld.bodies).not.toContain(physicsBody);
  });

  it('should remove a physics body from the engine world after its entity is removed', () => {
    const entity = world.createEntity();
    const physicsBody = new RigidBody({ shape: new CircleShape(10) });

    addPhysicsBodyComponent(world, entity, { physicsBody });
    addPositionComponent(world, entity);
    addRotationComponent(world, entity);

    time.update(16);
    world.update();

    expect(physicsWorld.bodies).toContain(physicsBody);

    world.removeEntity(entity);

    time.update(16);
    world.update();

    expect(physicsWorld.bodies).not.toContain(physicsBody);
  });

  it('should not leave a ghost body registered when an entity id is reused for a new body within the same tick', () => {
    // EcsWorld recycles entity ids as soon as an entity is removed, so a
    // remove-then-immediately-recreate (e.g. a respawn that clears a batch
    // of entities and spawns a new one in the same system run) can hand
    // the freed id straight to a brand new PhysicsBodyId component before
    // this system ever sees the entity as briefly gone.
    const entity = world.createEntity();
    const oldBody = new RigidBody({ shape: new CircleShape(10) });

    addPhysicsBodyComponent(world, entity, { physicsBody: oldBody });
    addPositionComponent(world, entity);
    addRotationComponent(world, entity);

    time.update(16);
    world.update();

    expect(physicsWorld.bodies).toContain(oldBody);

    world.removeEntity(entity);
    const reusedEntity = world.createEntity();

    expect(reusedEntity).toBe(entity);

    const newBody = new RigidBody({ shape: new CircleShape(10) });

    addPhysicsBodyComponent(world, reusedEntity, { physicsBody: newBody });
    addPositionComponent(world, reusedEntity, {
      local: new Vector2(500, 500),
      world: new Vector2(500, 500),
    });
    addRotationComponent(world, reusedEntity);

    time.update(16);
    world.update();

    expect(physicsWorld.bodies).toContain(newBody);
    expect(physicsWorld.bodies).not.toContain(oldBody);
  });

  it('should remove a physics body as soon as its entity is removed, without waiting for the next update', () => {
    const entity = world.createEntity();
    const physicsBody = new RigidBody({ shape: new CircleShape(10) });

    addPhysicsBodyComponent(world, entity, { physicsBody });
    addPositionComponent(world, entity);
    addRotationComponent(world, entity);

    time.update(16);
    world.update();

    expect(physicsWorld.bodies).toContain(physicsBody);

    world.removeEntity(entity);

    expect(physicsWorld.bodies).not.toContain(physicsBody);
  });

  it('should stop reacting to entity removal once the system has been removed from the world', () => {
    const isolatedWorld = new EcsWorld();
    const isolatedPhysicsWorld = new PhysicsWorld({ gravity: Vector2.zero });
    const system = createPhysicsSyncEcsSystem(isolatedPhysicsWorld, time);

    isolatedWorld.addSystem(system);

    const entity = isolatedWorld.createEntity();
    const physicsBody = new RigidBody({ shape: new CircleShape(10) });

    addPhysicsBodyComponent(isolatedWorld, entity, { physicsBody });
    addPositionComponent(isolatedWorld, entity);
    addRotationComponent(isolatedWorld, entity);

    time.update(16);
    isolatedWorld.update();

    expect(isolatedPhysicsWorld.bodies).toContain(physicsBody);

    isolatedWorld.removeSystem(system);
    isolatedWorld.removeEntity(entity);

    expect(isolatedPhysicsWorld.bodies).toContain(physicsBody);
  });

  it('should drive a kinematic body from ECS position/rotation without the body driving ECS back', () => {
    const entity = world.createEntity();
    const physicsBody = new RigidBody({
      shape: new CircleShape(10),
      isSensor: true,
    });

    addPhysicsBodyComponent(world, entity, {
      physicsBody,
      isKinematic: true,
    });

    const positionComponent = addPositionComponent(world, entity, {
      local: new Vector2(50, 75),
      world: new Vector2(50, 75),
    });

    addRotationComponent(world, entity, { local: 0.5, world: 0.5 });

    time.update(16);
    world.update();

    expect(physicsBody.position.x).toBe(50);
    expect(physicsBody.position.y).toBe(75);
    expect(physicsBody.angle).toBe(-0.5);
    expect(positionComponent.world.x).toBe(50);
    expect(positionComponent.world.y).toBe(75);
  });

  it('should resolve collisionStart events to ECS entity pairs for overlapping kinematic bodies', () => {
    const entityA = world.createEntity();
    const entityB = world.createEntity();

    const bodyA = new RigidBody({ shape: new CircleShape(20), isSensor: true });
    const bodyB = new RigidBody({
      shape: new CircleShape(20),
      position: new Vector2(10, 0),
      isSensor: true,
    });

    addPhysicsBodyComponent(world, entityA, {
      physicsBody: bodyA,
      isKinematic: true,
    });
    addPositionComponent(world, entityA);
    addRotationComponent(world, entityA);

    addPhysicsBodyComponent(world, entityB, {
      physicsBody: bodyB,
      isKinematic: true,
    });
    addPositionComponent(world, entityB, {
      local: new Vector2(10, 0),
      world: new Vector2(10, 0),
    });
    addRotationComponent(world, entityB);

    time.update(16);
    world.update();

    expect(physicsWorld.collisionStarts).toHaveLength(1);

    const [pair] = physicsWorld.collisionStarts;
    const entities = [
      pair.bodyA.userData as number,
      pair.bodyB.userData as number,
    ].sort((a, b) => a - b);
    expect(entities).toEqual([entityA, entityB].sort((a, b) => a - b));
  });

  it('should resolve collisionEnd events to ECS entity pairs once kinematic bodies separate', () => {
    const entityA = world.createEntity();
    const entityB = world.createEntity();

    const bodyA = new RigidBody({ shape: new CircleShape(20), isSensor: true });
    const bodyB = new RigidBody({
      shape: new CircleShape(20),
      position: new Vector2(10, 0),
      isSensor: true,
    });

    addPhysicsBodyComponent(world, entityA, {
      physicsBody: bodyA,
      isKinematic: true,
    });
    addPositionComponent(world, entityA);
    addRotationComponent(world, entityA);

    addPhysicsBodyComponent(world, entityB, {
      physicsBody: bodyB,
      isKinematic: true,
    });

    const positionComponentB = addPositionComponent(world, entityB, {
      local: new Vector2(10, 0),
      world: new Vector2(10, 0),
    });

    addRotationComponent(world, entityB);

    time.update(16);
    world.update();

    positionComponentB.world.x = 1000;

    time.update(16);
    world.update();

    time.update(16);
    world.update();

    expect(physicsWorld.collisionEnds).toHaveLength(1);

    const [pair] = physicsWorld.collisionEnds;
    const entities = [
      pair.bodyA.userData as number,
      pair.bodyB.userData as number,
    ].sort((a, b) => a - b);
    expect(entities).toEqual([entityA, entityB].sort((a, b) => a - b));
  });

  it('should not produce collision events between two overlapping static bodies', () => {
    const entityA = world.createEntity();
    const entityB = world.createEntity();

    const bodyA = new RigidBody({
      shape: new CircleShape(20),
      isStatic: true,
      isSensor: true,
    });
    const bodyB = new RigidBody({
      shape: new CircleShape(20),
      position: new Vector2(10, 0),
      isStatic: true,
      isSensor: true,
    });

    addPhysicsBodyComponent(world, entityA, { physicsBody: bodyA });
    addPositionComponent(world, entityA);
    addRotationComponent(world, entityA);

    addPhysicsBodyComponent(world, entityB, { physicsBody: bodyB });
    addPositionComponent(world, entityB, {
      local: new Vector2(10, 0),
      world: new Vector2(10, 0),
    });
    addRotationComponent(world, entityB);

    time.update(16);
    world.update();

    expect(physicsWorld.collisionStarts).toHaveLength(0);
  });
});
