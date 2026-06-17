import { describe, expect, it } from 'vitest';
import { parentId } from '../../common/components/parent-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { destroyUiSubtree } from './destroy-ui-subtree.js';

function makeTransform() {
  return {
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(0, 0),
    offsetMin: new Vector2(0, 0),
    offsetMax: new Vector2(100, 100),
    pivot: new Vector2(0, 0),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(100, 100)),
    worldMatrix: Matrix3x3.identity,
    isDirty: true,
  };
}

describe('destroyUiSubtree', () => {
  it('removes a leaf entity with no children', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    world.addComponent(entity, uiTransformId, makeTransform());

    destroyUiSubtree(world, entity);

    expect(world.getComponent(entity, uiTransformId)).toBeNull();
  });

  it('removes direct children before removing the root', () => {
    const world = new EcsWorld();
    const root = world.createEntity();
    const child = world.createEntity();

    world.addComponent(root, uiTransformId, makeTransform());
    world.addComponent(child, uiTransformId, makeTransform());
    world.addComponent(child, parentId, { parent: root });

    destroyUiSubtree(world, root);

    expect(world.getComponent(root, uiTransformId)).toBeNull();
    expect(world.getComponent(child, uiTransformId)).toBeNull();
    expect(world.getComponent(child, parentId)).toBeNull();
  });

  it('removes grandchildren (recursive depth > 1)', () => {
    const world = new EcsWorld();
    const root = world.createEntity();
    const child = world.createEntity();
    const grandchild = world.createEntity();

    world.addComponent(root, uiTransformId, makeTransform());
    world.addComponent(child, uiTransformId, makeTransform());
    world.addComponent(grandchild, uiTransformId, makeTransform());
    world.addComponent(child, parentId, { parent: root });
    world.addComponent(grandchild, parentId, { parent: child });

    destroyUiSubtree(world, root);

    expect(world.getComponent(root, uiTransformId)).toBeNull();
    expect(world.getComponent(child, uiTransformId)).toBeNull();
    expect(world.getComponent(grandchild, uiTransformId)).toBeNull();
  });

  it('removes all children in a wide tree', () => {
    const world = new EcsWorld();
    const root = world.createEntity();

    world.addComponent(root, uiTransformId, makeTransform());

    const children: number[] = [];

    for (let i = 0; i < 5; i++) {
      const child = world.createEntity();

      world.addComponent(child, uiTransformId, makeTransform());
      world.addComponent(child, parentId, { parent: root });
      children.push(child);
    }

    destroyUiSubtree(world, root);

    expect(world.getComponent(root, uiTransformId)).toBeNull();

    for (const child of children) {
      expect(world.getComponent(child, uiTransformId)).toBeNull();
    }
  });

  it('does not remove sibling entities that share no parent relationship', () => {
    const world = new EcsWorld();
    const root = world.createEntity();
    const sibling = world.createEntity();
    const child = world.createEntity();

    world.addComponent(root, uiTransformId, makeTransform());
    world.addComponent(sibling, uiTransformId, makeTransform());
    world.addComponent(child, uiTransformId, makeTransform());
    world.addComponent(child, parentId, { parent: root });

    destroyUiSubtree(world, root);

    expect(world.getComponent(root, uiTransformId)).toBeNull();
    expect(world.getComponent(child, uiTransformId)).toBeNull();
    expect(world.getComponent(sibling, uiTransformId)).not.toBeNull();
  });
});
