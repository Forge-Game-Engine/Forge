import { beforeEach, describe, expect, it } from 'vitest';
import { createRevoluteJointEcsSystem } from './revolute-joint.system.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { addRevoluteJointComponent } from '../components/index.js';
import { RevoluteJoint } from '../joints/index.js';
import { PhysicsWorld } from '../physics-world.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const createJoint = (): RevoluteJoint =>
  new RevoluteJoint({
    bodyA: new RigidBody({ shape: new CircleShape(1) }),
    bodyB: new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(2, 0),
    }),
  });

describe('RevoluteJointSystem', () => {
  let world: EcsWorld;
  let physicsWorld: PhysicsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    physicsWorld = new PhysicsWorld({ gravity: Vector2.zero });
    world.addSystem(createRevoluteJointEcsSystem(physicsWorld));
  });

  it('should register a joint on first update and remove it when the world stops', () => {
    const entity = world.createEntity();
    const joint = createJoint();

    addRevoluteJointComponent(world, entity, { joint });

    expect(physicsWorld.joints).not.toContain(joint);

    world.update();

    expect(physicsWorld.joints).toContain(joint);

    world.stop();

    expect(physicsWorld.joints).not.toContain(joint);
  });

  it('should remove a joint from the engine world after its entity is removed', () => {
    const entity = world.createEntity();
    const joint = createJoint();

    addRevoluteJointComponent(world, entity, { joint });

    world.update();

    expect(physicsWorld.joints).toContain(joint);

    world.removeEntity(entity);

    expect(physicsWorld.joints).not.toContain(joint);
  });

  it('should not leave a ghost joint registered when an entity id is reused for a new joint within the same tick', () => {
    const entity = world.createEntity();
    const oldJoint = createJoint();

    addRevoluteJointComponent(world, entity, { joint: oldJoint });

    world.update();

    expect(physicsWorld.joints).toContain(oldJoint);

    world.removeEntity(entity);
    const reusedEntity = world.createEntity();

    expect(reusedEntity).toBe(entity);

    const newJoint = createJoint();

    addRevoluteJointComponent(world, reusedEntity, { joint: newJoint });

    world.update();

    expect(physicsWorld.joints).toContain(newJoint);
    expect(physicsWorld.joints).not.toContain(oldJoint);
  });

  it('should handle multiple joints', () => {
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();
    const joint1 = createJoint();
    const joint2 = createJoint();

    addRevoluteJointComponent(world, entity1, { joint: joint1 });
    addRevoluteJointComponent(world, entity2, { joint: joint2 });

    world.update();

    expect(physicsWorld.joints).toContain(joint1);
    expect(physicsWorld.joints).toContain(joint2);
  });

  it('should stop reacting to entity removal once the system has been removed from the world', () => {
    const isolatedWorld = new EcsWorld();
    const isolatedPhysicsWorld = new PhysicsWorld({ gravity: Vector2.zero });
    const system = createRevoluteJointEcsSystem(isolatedPhysicsWorld);

    isolatedWorld.addSystem(system);

    const entity = isolatedWorld.createEntity();
    const joint = createJoint();

    addRevoluteJointComponent(isolatedWorld, entity, { joint });

    isolatedWorld.update();

    expect(isolatedPhysicsWorld.joints).toContain(joint);

    isolatedWorld.removeSystem(system);
    isolatedWorld.removeEntity(entity);

    expect(isolatedPhysicsWorld.joints).toContain(joint);
  });
});
