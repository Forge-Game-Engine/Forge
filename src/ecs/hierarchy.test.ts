import { beforeEach, describe, expect, it } from 'vitest';
import { createComponentId } from './ecs-component.js';
import { EcsWorld } from './ecs-world.js';
import { parentId } from './hierarchy.js';

describe('EcsWorld hierarchy', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
  });

  describe('setParent', () => {
    it('sets the parent and appends to the parent’s children', () => {
      const parent = world.createEntity();
      const first = world.createEntity();
      const second = world.createEntity();

      world.setParent(first, parent);
      world.setParent(second, parent);

      expect(world.getParent(first)).toBe(parent);
      expect(world.getComponent(first, parentId)).toEqual({ parent });
      expect(world.getChildren(parent)).toEqual([first, second]);
    });

    it('moves a child from its old parent, keeping both sibling orders', () => {
      const oldParent = world.createEntity();
      const newParent = world.createEntity();
      const [a, b, c] = [
        world.createEntity(),
        world.createEntity(),
        world.createEntity(),
      ];
      const existing = world.createEntity();

      world.setParent(a, oldParent);
      world.setParent(b, oldParent);
      world.setParent(c, oldParent);
      world.setParent(existing, newParent);

      world.setParent(b, newParent);

      expect(world.getParent(b)).toBe(newParent);
      expect(world.getChildren(oldParent)).toEqual([a, c]);
      expect(world.getChildren(newParent)).toEqual([existing, b]);
    });

    it('does nothing when given the current parent, keeping the sibling order', () => {
      const parent = world.createEntity();
      const a = world.createEntity();
      const b = world.createEntity();

      world.setParent(a, parent);
      world.setParent(b, parent);
      const component = world.getComponent(a, parentId);

      world.setParent(a, parent);

      expect(world.getChildren(parent)).toEqual([a, b]);
      expect(world.getComponent(a, parentId)).toBe(component);
    });

    it('throws when parenting an entity to itself', () => {
      const entity = world.createEntity();

      expect(() => world.setParent(entity, entity)).toThrow(
        'itself or one of its descendants',
      );
    });

    it('throws when parenting an entity to one of its descendants', () => {
      const root = world.createEntity();
      const child = world.createEntity();
      const grandchild = world.createEntity();

      world.setParent(child, root);
      world.setParent(grandchild, child);

      expect(() => world.setParent(root, grandchild)).toThrow(
        'itself or one of its descendants',
      );
      expect(world.getParent(root)).toBeNull();
      expect(world.getChildren(grandchild)).toEqual([]);
    });

    it('throws when the child or the parent isn’t alive', () => {
      const alive = world.createEntity();
      const removed = world.createEntity();
      world.removeEntity(removed);

      expect(() => world.setParent(removed, alive)).toThrow("isn't alive");
      expect(() => world.setParent(alive, removed)).toThrow("isn't alive");
      expect(world.getChildren(removed)).toEqual([]);
    });
  });

  describe('removeParent', () => {
    it('makes the child a root and takes it out of its parent’s children in order', () => {
      const parent = world.createEntity();
      const [a, b, c] = [
        world.createEntity(),
        world.createEntity(),
        world.createEntity(),
      ];

      world.setParent(a, parent);
      world.setParent(b, parent);
      world.setParent(c, parent);

      world.removeParent(b);

      expect(world.getParent(b)).toBeNull();
      expect(world.getComponent(b, parentId)).toBeNull();
      expect(world.getChildren(parent)).toEqual([a, c]);
    });

    it('does nothing for a root entity', () => {
      const entity = world.createEntity();

      expect(() => world.removeParent(entity)).not.toThrow();
      expect(world.getParent(entity)).toBeNull();
    });
  });

  describe('the parent component', () => {
    it('can’t be added with addComponent', () => {
      const parent = world.createEntity();
      const child = world.createEntity();

      expect(() => world.addComponent(child, parentId, { parent })).toThrow(
        'use setParent',
      );
      expect(world.getChildren(parent)).toEqual([]);
    });

    it('can’t be removed with removeComponent', () => {
      const parent = world.createEntity();
      const child = world.createEntity();
      world.setParent(child, parent);

      expect(() => world.removeComponent(child, parentId)).toThrow(
        'use removeParent',
      );
      expect(world.getParent(child)).toBe(parent);
    });
  });

  describe('removeEntity', () => {
    it('removes every descendant, depth first, before the entity itself', () => {
      const root = world.createEntity();
      const a = world.createEntity();
      const aChild = world.createEntity();
      const b = world.createEntity();
      const removed: number[] = [];
      world.onEntityRemoved.registerListener((entity) => removed.push(entity));

      world.setParent(a, root);
      world.setParent(aChild, a);
      world.setParent(b, root);

      expect(world.removeEntity(root)).toBe(true);

      expect(removed).toEqual([aChild, a, b, root]);

      for (const entity of [root, a, aChild, b]) {
        expect(world.isAlive(entity)).toBe(false);
      }

      expect(world.getChildren(root)).toEqual([]);
    });

    it('lets a descendant’s listener read its ancestors’ components', () => {
      const marker = createComponentId<{ value: number }>('Marker');
      const root = world.createEntity();
      const child = world.createEntity();
      world.addComponent(root, marker, { value: 7 });
      world.setParent(child, root);
      const seen: (number | undefined)[] = [];

      world.onEntityRemoved.registerListener((entity) => {
        if (entity === child) {
          seen.push(world.getComponent(root, marker)?.value);
          seen.push(world.isAlive(root) ? 1 : 0);
        }
      });

      world.removeEntity(root);

      expect(seen).toEqual([7, 0]);
      expect(world.getComponent(root, marker)).toBeNull();
    });

    it('keeps a child that was unparented first', () => {
      const parent = world.createEntity();
      const kept = world.createEntity();
      world.setParent(kept, parent);

      world.removeParent(kept);
      world.removeEntity(parent);

      expect(world.isAlive(kept)).toBe(true);
    });

    it('keeps a child a listener reparents while its parent is being removed', () => {
      const parent = world.createEntity();
      const other = world.createEntity();
      const first = world.createEntity();
      const second = world.createEntity();
      world.setParent(first, parent);
      world.setParent(second, parent);

      world.onEntityRemoved.registerListener((entity) => {
        if (entity === first) {
          world.setParent(second, other);
        }
      });

      world.removeEntity(parent);

      expect(world.isAlive(first)).toBe(false);
      expect(world.isAlive(second)).toBe(true);
      expect(world.getParent(second)).toBe(other);
      expect(world.getChildren(other)).toEqual([second]);
    });

    it('takes a removed child out of its parent’s children, keeping the order', () => {
      const parent = world.createEntity();
      const [a, b, c] = [
        world.createEntity(),
        world.createEntity(),
        world.createEntity(),
      ];
      world.setParent(a, parent);
      world.setParent(b, parent);
      world.setParent(c, parent);

      world.removeEntity(b);

      expect(world.getChildren(parent)).toEqual([a, c]);
    });

    it('doesn’t change sibling order when an unrelated entity is removed', () => {
      const unrelated = world.createEntity();
      const parent = world.createEntity();
      const [a, b, c] = [
        world.createEntity(),
        world.createEntity(),
        world.createEntity(),
      ];
      world.setParent(unrelated, world.createEntity());
      world.setParent(a, parent);
      world.setParent(b, parent);
      world.setParent(c, parent);

      world.removeEntity(unrelated);

      expect(world.getChildren(parent)).toEqual([a, b, c]);
    });

    it('doesn’t let a reused slot inherit the removed entity’s children', () => {
      const parent = world.createEntity();
      const child = world.createEntity();
      world.setParent(child, parent);
      world.removeEntity(parent);

      const reused = world.createEntity();

      expect(world.getChildren(reused)).toEqual([]);
    });
  });
});
