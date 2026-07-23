import { beforeEach, describe, expect, it } from 'vitest';
import { addRotationComponent } from '../components';
import { EcsWorld } from '../../ecs';
import { addParentComponent } from '../components/parent-component';
import { createParentRotationEcsSystem } from './parent-rotation-system';

describe('parent-rotation-system', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createParentRotationEcsSystem());
  });

  it('root rotations should have the same world and local values', () => {
    const entity = world.createEntity();

    const rotationComponent = addRotationComponent(world, entity, {
      local: 10,
    });

    world.update();

    expect(rotationComponent.world).toBe(10);
    expect(rotationComponent.local).toBe(10);
  });

  it('should compute world rotations for a parent-child hierarchy', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    const parentRotation = addRotationComponent(world, parent, {
      local: 10,
    });

    const childRotation = addRotationComponent(world, child, {
      local: 5,
    });

    addParentComponent(world, child, { parent });
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

    const parentRotation = addRotationComponent(world, parent, {
      local: 10,
    });

    const childRotation = addRotationComponent(world, child, {
      local: 5,
    });

    const grandchildRotation = addRotationComponent(world, grandchild, {
      local: 2,
    });

    addParentComponent(world, child, { parent });
    addParentComponent(world, grandchild, { parent: child });

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

    const grandchildRotation = addRotationComponent(world, grandchild, {
      local: 2,
    });

    const parentRotation = addRotationComponent(world, parent, {
      local: 10,
    });

    const childRotation = addRotationComponent(world, child, {
      local: 5,
    });

    addParentComponent(world, grandchild, { parent: child });
    addParentComponent(world, child, { parent });

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

    const parentRotation = addRotationComponent(world, parent, {
      local: 10,
    });

    const childRotation = addRotationComponent(world, child, {
      local: 5,
    });

    const grandchildRotation = addRotationComponent(world, grandchild, {
      local: 2,
    });

    addParentComponent(world, child, { parent });
    addParentComponent(world, grandchild, { parent: child });

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
