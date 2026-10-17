import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '../common/index.js';
import { EcsWorld } from '../ecs/ecs-world.js';
import { addDrawOrderComponent } from './components/draw-order-component.js';
import { createDrawOrderResolver, DrawOrderResolver } from './draw-order.js';

describe('createDrawOrderResolver', () => {
  let world: EcsWorld;
  let resolver: DrawOrderResolver;

  const addEntity = (y: number, parent: number | null = null): number => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x: 0, y } });

    if (parent !== null) {
      world.setParent(entity, parent);
    }

    return entity;
  };

  const resolveAll = (...entities: number[]): void => {
    resolver.resolve(world, entities);
  };

  beforeEach(() => {
    world = new EcsWorld();
    resolver = createDrawOrderResolver();
  });

  describe('sortUnitY', () => {
    it("is the root's Y for every entity of a subtree without ySortChildren", () => {
      const root = addEntity(3);
      const child = addEntity(10, root);
      const grandchild = addEntity(20, child);

      resolveAll(grandchild);

      expect(resolver.sortUnitY(root)).toBe(3);
      expect(resolver.sortUnitY(child)).toBe(3);
      expect(resolver.sortUnitY(grandchild)).toBe(3);
    });

    it("is each child's own Y under a ySortChildren root, and grandchildren share their parent's", () => {
      const root = addEntity(3);
      const child = addEntity(10, root);
      const grandchild = addEntity(20, child);

      addDrawOrderComponent(world, root, { ySortChildren: true });
      resolveAll(grandchild);

      expect(resolver.sortUnitY(root)).toBe(3);
      expect(resolver.sortUnitY(child)).toBe(10);
      expect(resolver.sortUnitY(grandchild)).toBe(10);
    });

    it("ignores ySortChildren on an entity that isn't a sort unit", () => {
      const root = addEntity(3);
      const layer = addEntity(10, root);
      const row = addEntity(20, layer);

      addDrawOrderComponent(world, layer, { ySortChildren: true });
      resolveAll(row);

      expect(resolver.sortUnitY(layer)).toBe(3);
      expect(resolver.sortUnitY(row)).toBe(3);
    });

    it('makes the children of nested ySortChildren entities sort units', () => {
      const level = addEntity(3);
      const layer = addEntity(10, level);
      const row = addEntity(20, layer);
      const tile = addEntity(30, row);

      addDrawOrderComponent(world, level, { ySortChildren: true });
      addDrawOrderComponent(world, layer, { ySortChildren: true });
      resolveAll(tile);

      expect(resolver.sortUnitY(layer)).toBe(10);
      expect(resolver.sortUnitY(row)).toBe(20);
      expect(resolver.sortUnitY(tile)).toBe(20);
    });

    it("adds ySortOrigin along the unit entity's own Y axis, through its rotation and scale", () => {
      const root = addEntity(1);

      addRotationComponent(world, root, { local: Math.PI / 3 });
      addScaleComponent(world, root, { local: { x: 5, y: 2 } });
      addDrawOrderComponent(world, root, { ySortOrigin: 3 });
      resolveAll(root);

      // 1 + 3 * 2 * cos(π / 3)
      expect(resolver.sortUnitY(root)).toBeCloseTo(4);
    });

    it('sorts a unit without a position at its ySortOrigin', () => {
      const root = world.createEntity();
      const child = addEntity(50, root);

      addRotationComponent(world, root, { local: Math.PI });
      addDrawOrderComponent(world, root, { ySortOrigin: 2 });
      resolveAll(child);

      expect(resolver.sortUnitY(child)).toBe(2);
    });

    it("ignores ySortOrigin on an entity that isn't a sort unit", () => {
      const root = addEntity(3);
      const child = addEntity(10, root);

      addDrawOrderComponent(world, child, { ySortOrigin: 7 });
      resolveAll(child);

      expect(resolver.sortUnitY(child)).toBe(3);
    });

    it('reads ySortChildren again on every resolve', () => {
      const root = addEntity(3);
      const child = addEntity(10, root);
      const drawOrder = addDrawOrderComponent(world, root);

      resolveAll(child);
      expect(resolver.sortUnitY(child)).toBe(3);

      drawOrder.ySortChildren = true;
      resolveAll(child);
      expect(resolver.sortUnitY(child)).toBe(10);
    });
  });

  describe('hierarchyIndex', () => {
    it("numbers the root's whole subtree the same with and without ySortChildren", () => {
      const root = addEntity(0);
      const behind = addEntity(0, root);
      const front = addEntity(0, root);
      const frontChild = addEntity(0, front);

      addDrawOrderComponent(world, behind, { behindParent: true });

      const indices = (): number[] => {
        resolveAll(frontChild, behind);

        return [root, behind, front, frontChild].map((entity) =>
          resolver.hierarchyIndex(entity),
        );
      };

      const withoutYSortChildren = indices();

      addDrawOrderComponent(world, root, { ySortChildren: true });

      expect(indices()).toEqual(withoutYSortChildren);
      expect(withoutYSortChildren).toEqual([1, 0, 2, 3]);
    });
  });
});
