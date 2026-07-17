import { beforeEach, describe, expect, it } from 'vitest';
import { createPrismaticJointEcsSystem } from './prismatic-joint.system.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import {
  PrismaticJointEcsComponent,
  PrismaticJointId,
} from '../components/index.js';
import { PrismaticJoint } from '../joints/index.js';
import { PhysicsWorld } from '../physics-world.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const createJoint = (): PrismaticJoint =>
  new PrismaticJoint({
    bodyA: new RigidBody({ shape: new CircleShape(1) }),
    bodyB: new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(2, 0),
    }),
  });

describe('PrismaticJointSystem', () => {
  let world: EcsWorld;
  let physicsWorld: PhysicsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    physicsWorld = new PhysicsWorld({ gravity: Vector2.zero });
    world.addSystem(createPrismaticJointEcsSystem(physicsWorld));
  });

  it('should register a joint on first update and remove it when the world stops', () => {
    const entity = world.createEntity();
    const joint = createJoint();

    world.addComponent(entity, PrismaticJointId, { joint });

    expect(physicsWorld.joints).not.toContain(joint);

    world.update();

    expect(physicsWorld.joints).toContain(joint);

    world.stop();

    expect(physicsWorld.joints).not.toContain(joint);
  });

  it('should remove a joint from the engine world after its entity is removed', () => {
    const entity = world.createEntity();
    const joint = createJoint();

    world.addComponent(entity, PrismaticJointId, { joint });

    world.update();

    expect(physicsWorld.joints).toContain(joint);

    world.removeEntity(entity);

    expect(physicsWorld.joints).not.toContain(joint);
  });

  it('should not leave a ghost joint registered when an entity id is reused for a new joint within the same tick', () => {
    const entity = world.createEntity();
    const oldJoint = createJoint();

    world.addComponent(entity, PrismaticJointId, { joint: oldJoint });

    world.update();

    expect(physicsWorld.joints).toContain(oldJoint);

    world.removeEntity(entity);
    const reusedEntity = world.createEntity();

    expect(reusedEntity).toBe(entity);

    const newJoint = createJoint();

    world.addComponent(reusedEntity, PrismaticJointId, { joint: newJoint });

    world.update();

    expect(physicsWorld.joints).toContain(newJoint);
    expect(physicsWorld.joints).not.toContain(oldJoint);
  });

  it('should handle multiple joints', () => {
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();
    const joint1 = createJoint();
    const joint2 = createJoint();

    world.addComponent<PrismaticJointEcsComponent>(entity1, PrismaticJointId, {
      joint: joint1,
    });
    world.addComponent<PrismaticJointEcsComponent>(entity2, PrismaticJointId, {
      joint: joint2,
    });

    world.update();

    expect(physicsWorld.joints).toContain(joint1);
    expect(physicsWorld.joints).toContain(joint2);
  });

  it('should stop reacting to entity removal once the system has been removed from the world', () => {
    const isolatedWorld = new EcsWorld();
    const isolatedPhysicsWorld = new PhysicsWorld({ gravity: Vector2.zero });
    const system = createPrismaticJointEcsSystem(isolatedPhysicsWorld);

    isolatedWorld.addSystem(system);

    const entity = isolatedWorld.createEntity();
    const joint = createJoint();

    isolatedWorld.addComponent(entity, PrismaticJointId, { joint });

    isolatedWorld.update();

    expect(isolatedPhysicsWorld.joints).toContain(joint);

    isolatedWorld.removeSystem(system);
    isolatedWorld.removeEntity(entity);

    expect(isolatedPhysicsWorld.joints).toContain(joint);
  });
});
