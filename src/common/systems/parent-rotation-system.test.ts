import { beforeEach, describe, expect, it } from 'vitest';
import { RotationEcsComponent, rotationId } from '../components';
import { EcsWorld } from '../../new-ecs';
import { ParentEcsComponent, parentId } from '../components/parent-component';
import { createParentRotationEcsSystem } from './parent-rotation-system';

describe('parent-rotation-system', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createParentRotationEcsSystem());
  });

  it('root rotations should have the same world and local values', () => {
    const entity = world.createEntity();

    const rotationComponent: RotationEcsComponent = {
      local: 10,
      world: 0,
    };

    world.addComponent(entity, rotationId, rotationComponent);

    world.update();

    expect(rotationComponent.world).toBe(10);
    expect(rotationComponent.local).toBe(10);
  });

  it('should compute world rotations for a parent-child hierarchy', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    const parentRotation: RotationEcsComponent = {
      local: 10,
      world: 0,
    };

    const childRotation: RotationEcsComponent = {
      local: 5,
      world: 0,
    };

    const parentComponent: ParentEcsComponent = { parent };

    world.addComponent(parent, rotationId, parentRotation);
    world.addComponent(child, rotationId, childRotation);
    world.addComponent(child, parentId, parentComponent);
    world.update();

    expect(parentRotation.world).toBe(10);
    expect(parentRotation.local).toBe(10);

    expect(childRotation.world).toBe(15);
    expect(childRotation.local).toBe(5);
  });

  it('should compute world rotations for a parent-child-grandchild hierarchy', () => {
    const parent = world.createEntity();
    const child = world.createEntity();
    const grandchild = world.createEntity();

    const parentRotation: RotationEcsComponent = {
      local: 10,
      world: 0,
    };

    const childRotation: RotationEcsComponent = {
      local: 5,
      world: 0,
    };

    const grandchildRotation: RotationEcsComponent = {
      local: 2,
      world: 0,
    };

    world.addComponent(parent, rotationId, parentRotation);
    world.addComponent(child, rotationId, childRotation);
    world.addComponent(grandchild, rotationId, grandchildRotation);

    world.addComponent(child, parentId, { parent });
    world.addComponent(grandchild, parentId, { parent: child });

    world.update();

    expect(parentRotation.world).toBe(10);
    expect(parentRotation.local).toBe(10);

    expect(childRotation.world).toBe(15);
    expect(childRotation.local).toBe(5);

    expect(grandchildRotation.world).toBe(17);
    expect(grandchildRotation.local).toBe(2);
  });

  it('should compute world rotations for a parent-child-grandchild hierarchy (out-of-order registration)', () => {
    const parent = world.createEntity();
    const grandchild = world.createEntity();
    const child = world.createEntity();

    const parentRotation: RotationEcsComponent = {
      local: 10,
      world: 0,
    };

    const childRotation: RotationEcsComponent = {
      local: 5,
      world: 0,
    };

    const grandchildRotation: RotationEcsComponent = {
      local: 2,
      world: 0,
    };

    world.addComponent(grandchild, rotationId, grandchildRotation);
    world.addComponent(parent, rotationId, parentRotation);
    world.addComponent(child, rotationId, childRotation);

    world.addComponent(grandchild, parentId, { parent: child });
    world.addComponent(child, parentId, { parent });

    world.update();

    expect(parentRotation.world).toBe(10);
    expect(parentRotation.local).toBe(10);

    expect(childRotation.world).toBe(15);
    expect(childRotation.local).toBe(5);

    expect(grandchildRotation.world).toBe(17);
    expect(grandchildRotation.local).toBe(2);
  });

  it('should compute world rotations for a parent-child-grandchild hierarchy after they rotate', () => {
    const parent = world.createEntity();
    const child = world.createEntity();
    const grandchild = world.createEntity();

    const parentRotation: RotationEcsComponent = {
      local: 10,
      world: 0,
    };

    const childRotation: RotationEcsComponent = {
      local: 5,
      world: 0,
    };

    const grandchildRotation: RotationEcsComponent = {
      local: 2,
      world: 0,
    };

    world.addComponent(parent, rotationId, parentRotation);
    world.addComponent(child, rotationId, childRotation);
    world.addComponent(grandchild, rotationId, grandchildRotation);

    world.addComponent(child, parentId, { parent });
    world.addComponent(grandchild, parentId, { parent: child });

    world.update();

    childRotation.local = 7;

    world.update();

    expect(parentRotation.world).toBe(10);
    expect(parentRotation.local).toBe(10);

    expect(childRotation.world).toBe(17);
    expect(childRotation.local).toBe(7);

    expect(grandchildRotation.world).toBe(19);
    expect(grandchildRotation.local).toBe(2);
  });
});
