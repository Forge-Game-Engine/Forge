import { describe, expect, it } from 'vitest';
import { createUiLayoutGroupEcsSystem } from './ui-layout-group-system.js';
import { createUiLayoutEcsSystem } from './ui-layout-system.js';
import {
  addParentComponent,
  addPositionComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { RenderContext } from '../../rendering/index.js';
import { addContentSizeFitterComponent } from '../components/content-size-fitter-component.js';
import { addLayoutElementComponent } from '../components/layout-element-component.js';
import {
  addGridLayoutGroupComponent,
  addHorizontalLayoutGroupComponent,
  addVerticalLayoutGroupComponent,
} from '../components/layout-group-component.js';
import {
  addRectTransformComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import { uiAlignments } from '../types/ui-alignment.js';

function createGroupEntity(
  world: EcsWorld,
  width: number,
  height: number,
): number {
  const entity = world.createEntity();

  addRectTransformComponent(world, entity, {
    rect: { min: { x: 0, y: 0 }, max: { x: width, y: height } },
  });

  return entity;
}

function createChild(
  world: EcsWorld,
  parent: number,
  sizeOrMargin: { x: number; y: number },
): number {
  const entity = world.createEntity();

  addParentComponent(world, entity, { parent });
  addRectTransformComponent(world, entity, { sizeOrMargin });

  return entity;
}

describe('createUiLayoutGroupEcsSystem', () => {
  describe('horizontal layout groups', () => {
    it('force-expands children along the main axis, and fills the cross axis, by default', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 300, 100);

      addHorizontalLayoutGroupComponent(world, group);

      const a = createChild(world, group, { x: 50, y: 50 });
      const b = createChild(world, group, { x: 50, y: 50 });
      const c = createChild(world, group, { x: 50, y: 50 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      for (const [entity, expectedX] of [
        [a, 0],
        [b, 100],
        [c, 200],
      ] as const) {
        const rect = world.getComponent(entity, rectTransformId)!;

        expect(rect.anchorMin).toEqual({ x: 0, y: 0 });
        expect(rect.anchorMax).toEqual({ x: 0, y: 0 });
        expect(rect.pivot).toEqual({ x: 0, y: 0 });
        // Main axis (width): 150 preferred total, 150 leftover split evenly
        // -> 100 each. Cross axis (height): force-expand fills the full box.
        expect(rect.sizeOrMargin).toEqual({ x: 100, y: 100 });
        expect(rect.anchoredPosition).toEqual({ x: expectedX, y: 0 });
      }
    });

    it("leaves a child's own size alone when childControlWidth/Height are false", () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 300, 100);

      addHorizontalLayoutGroupComponent(world, group, {
        childControlWidth: false,
        childForceExpandWidth: false,
        childControlHeight: false,
      });

      const a = createChild(world, group, { x: 40, y: 20 });
      const b = createChild(world, group, { x: 60, y: 30 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      const rectA = world.getComponent(a, rectTransformId)!;
      const rectB = world.getComponent(b, rectTransformId)!;

      expect(rectA.sizeOrMargin).toEqual({ x: 40, y: 20 });
      expect(rectA.anchoredPosition.x).toBe(0);
      expect(rectB.sizeOrMargin).toEqual({ x: 60, y: 30 });
      expect(rectB.anchoredPosition.x).toBe(40);
    });

    it('skips a child with LayoutElementEcsComponent.ignoreLayout', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 300, 100);

      addHorizontalLayoutGroupComponent(world, group);

      const a = createChild(world, group, { x: 50, y: 50 });
      const ignored = createChild(world, group, { x: 50, y: 50 });

      addLayoutElementComponent(world, ignored, { ignoreLayout: true });

      const ignoredRectBefore = {
        ...world.getComponent(ignored, rectTransformId)!,
      };

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      const rectA = world.getComponent(a, rectTransformId)!;

      // Only one arrangeable child, so it takes the entire content box.
      expect(rectA.sizeOrMargin.x).toBe(300);

      const ignoredRectAfter = world.getComponent(ignored, rectTransformId)!;

      expect(ignoredRectAfter.sizeOrMargin).toEqual(
        ignoredRectBefore.sizeOrMargin,
      );
      expect(ignoredRectAfter.anchorMin).toEqual(ignoredRectBefore.anchorMin);
    });

    it("distributes leftover main-axis space by each child's own flexible weight", () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 300, 100);

      addHorizontalLayoutGroupComponent(world, group);

      const a = createChild(world, group, { x: 50, y: 50 });
      const b = createChild(world, group, { x: 50, y: 50 });

      addLayoutElementComponent(world, a, { flexibleWidth: 1 });
      addLayoutElementComponent(world, b, { flexibleWidth: 3 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      // Preferred total = 100, leftover = 200, split 1:3 -> a gets 50, b
      // gets 150, on top of their own preferred 50 each.
      expect(
        world.getComponent(a, rectTransformId)!.sizeOrMargin.x,
      ).toBeCloseTo(100);
      expect(
        world.getComponent(b, rectTransformId)!.sizeOrMargin.x,
      ).toBeCloseTo(200);
    });
  });

  describe('vertical layout groups', () => {
    it('stacks children top-to-bottom, force-expanding the main axis (height)', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 100, 60);

      addVerticalLayoutGroupComponent(world, group, { spacing: 0 });

      const a = createChild(world, group, { x: 40, y: 20 });
      const b = createChild(world, group, { x: 40, y: 40 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      const rectA = world.getComponent(a, rectTransformId)!;
      const rectB = world.getComponent(b, rectTransformId)!;

      // Preferred total = 60, box = 60, no leftover: heights stay 20/40,
      // `a` (first child) at the top.
      expect(rectA.sizeOrMargin.y).toBeCloseTo(20);
      expect(rectA.anchoredPosition.y).toBeCloseTo(40);
      expect(rectB.sizeOrMargin.y).toBeCloseTo(40);
      expect(rectB.anchoredPosition.y).toBeCloseTo(0);

      // Cross axis (width) force-expands to the full box width by default.
      expect(rectA.sizeOrMargin.x).toBeCloseTo(100);
      expect(rectB.sizeOrMargin.x).toBeCloseTo(100);
    });

    it('aligns the block within leftover main-axis space per childAlignment', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 100, 100);

      addVerticalLayoutGroupComponent(world, group, {
        childControlHeight: false,
        childForceExpandHeight: false,
        childAlignment: uiAlignments.bottomCenter,
      });

      const a = createChild(world, group, { x: 40, y: 20 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      const rectA = world.getComponent(a, rectTransformId)!;

      // Bottom-aligned: leftover (80) all goes below, so the single 20-tall
      // child's bottom edge sits at the box's own bottom (y = 0).
      expect(rectA.anchoredPosition.y).toBeCloseTo(0);
    });

    it('is a no-op with no children', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 100, 100);

      addVerticalLayoutGroupComponent(world, group);

      world.addSystem(createUiLayoutGroupEcsSystem());

      expect(() => world.update()).not.toThrow();
    });

    it("sizes the cross axis to each child's own preferred size when childForceExpandWidth is off", () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 100, 100);

      addVerticalLayoutGroupComponent(world, group, {
        childForceExpandWidth: false,
      });

      const a = createChild(world, group, { x: 40, y: 20 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      // Cross axis (width) is controlled (childControlWidth stays the
      // default true) but not force-expanded, so it's sized to the
      // child's own measured preferred width (40) rather than filling
      // the box (100).
      expect(world.getComponent(a, rectTransformId)!.sizeOrMargin.x).toBe(40);
    });

    it("leaves a child's own width alone on the cross axis when childControlWidth is false", () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 100, 100);

      addVerticalLayoutGroupComponent(world, group, {
        childControlWidth: false,
      });

      const a = createChild(world, group, { x: 33, y: 20 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      expect(world.getComponent(a, rectTransformId)!.sizeOrMargin.x).toBe(33);
    });
  });

  describe('grid layout groups', () => {
    it('places cells row-major from the upper-left by default', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 100, 100);

      addGridLayoutGroupComponent(world, group, {
        cellSize: { x: 50, y: 50 },
        constraint: 'fixedColumnCount',
        constraintCount: 2,
      });

      const cells = [0, 1, 2].map(() =>
        createChild(world, group, { x: 50, y: 50 }),
      );

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      const positions = cells.map(
        (cell) => world.getComponent(cell, rectTransformId)!.anchoredPosition,
      );

      expect(positions[0]).toEqual({ x: 0, y: 50 });
      expect(positions[1]).toEqual({ x: 50, y: 50 });
      expect(positions[2]).toEqual({ x: 0, y: 0 });

      for (const cell of cells) {
        expect(world.getComponent(cell, rectTransformId)!.sizeOrMargin).toEqual(
          {
            x: 50,
            y: 50,
          },
        );
      }
    });

    it('derives column count from a fixed row count', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 100, 100);

      addGridLayoutGroupComponent(world, group, {
        cellSize: { x: 50, y: 50 },
        constraint: 'fixedRowCount',
        constraintCount: 2,
      });

      const cells = [0, 1, 2].map(() =>
        createChild(world, group, { x: 50, y: 50 }),
      );

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      const positions = cells.map(
        (cell) => world.getComponent(cell, rectTransformId)!.anchoredPosition,
      );

      // rows: 2 (fixed) -> columns: ceil(3 / 2) = 2, same layout as the
      // fixedColumnCount test above (columns also happens to be 2 there).
      expect(positions[0]).toEqual({ x: 0, y: 50 });
      expect(positions[1]).toEqual({ x: 50, y: 50 });
      expect(positions[2]).toEqual({ x: 0, y: 0 });
    });

    it('fills columns first, then wraps to a new row, for startAxis: vertical', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 100, 100);

      addGridLayoutGroupComponent(world, group, {
        cellSize: { x: 50, y: 50 },
        constraint: 'fixedColumnCount',
        constraintCount: 2,
        startAxis: 'vertical',
      });

      const cells = [0, 1, 2].map(() =>
        createChild(world, group, { x: 50, y: 50 }),
      );

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      const positions = cells.map(
        (cell) => world.getComponent(cell, rectTransformId)!.anchoredPosition,
      );

      // 2 columns, so 2 rows needed for 3 cells; startAxis: 'vertical' fills
      // the first column top-to-bottom before wrapping to the next column.
      expect(positions[0]).toEqual({ x: 0, y: 50 });
      expect(positions[1]).toEqual({ x: 0, y: 0 });
      expect(positions[2]).toEqual({ x: 50, y: 50 });
    });

    it('flips both column and row placement, for startCorner: lowerRight', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 100, 100);

      addGridLayoutGroupComponent(world, group, {
        cellSize: { x: 50, y: 50 },
        constraint: 'fixedColumnCount',
        constraintCount: 2,
        startCorner: 'lowerRight',
      });

      const cells = [0, 1, 2].map(() =>
        createChild(world, group, { x: 50, y: 50 }),
      );

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      const positions = cells.map(
        (cell) => world.getComponent(cell, rectTransformId)!.anchoredPosition,
      );

      expect(positions[0]).toEqual({ x: 50, y: 0 });
      expect(positions[1]).toEqual({ x: 0, y: 0 });
      expect(positions[2]).toEqual({ x: 50, y: 50 });
    });

    it('is a no-op with no children', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 100, 100);

      addGridLayoutGroupComponent(world, group);

      world.addSystem(createUiLayoutGroupEcsSystem());

      expect(() => world.update()).not.toThrow();
    });

    it('fits as many columns as the content box allows, for the default flexible constraint', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 100, 100);

      addGridLayoutGroupComponent(world, group, {
        cellSize: { x: 30, y: 30 },
        spacing: { x: 10, y: 10 },
      });

      const cells = [0, 1, 2, 3].map(() =>
        createChild(world, group, { x: 30, y: 30 }),
      );

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      // columns = floor((100 + 10) / (30 + 10)) = 2, so 2 rows for 4 cells.
      const positions = cells.map(
        (cell) => world.getComponent(cell, rectTransformId)!.anchoredPosition,
      );

      expect(positions[0].x).toBeCloseTo(0);
      expect(positions[1].x).toBeCloseTo(40);
      expect(positions[2].x).toBeCloseTo(0);
      expect(positions[3].x).toBeCloseTo(40);
    });
  });

  describe('ContentSizeFitterEcsComponent', () => {
    it("fits a group's own sizeOrMargin to its measured preferred content size", () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 500, 500);

      addVerticalLayoutGroupComponent(world, group, { spacing: 10 });
      addContentSizeFitterComponent(world, group, {
        horizontalFit: 'preferredSize',
        verticalFit: 'preferredSize',
      });

      createChild(world, group, { x: 40, y: 20 });
      createChild(world, group, { x: 60, y: 30 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      const groupRect = world.getComponent(group, rectTransformId)!;

      // width = max(40, 60); height = 20 + 30 + spacing(10)
      expect(groupRect.sizeOrMargin).toEqual({ x: 60, y: 60 });
    });

    it('is a no-op with nothing to measure', () => {
      const world = new EcsWorld();
      const entity = createGroupEntity(world, 200, 80);

      addContentSizeFitterComponent(world, entity, {
        horizontalFit: 'preferredSize',
        verticalFit: 'preferredSize',
      });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      // Falls back to the entity's own sizeOrMargin, which is untouched by
      // this system with no layout group present - a harmless self-assignment.
      expect(world.getComponent(entity, rectTransformId)!.sizeOrMargin).toEqual(
        {
          x: 100,
          y: 100,
        },
      );
    });

    it('leaves sizeOrMargin alone entirely when both fit modes default to unconstrained', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 500, 500);

      addVerticalLayoutGroupComponent(world, group);
      addContentSizeFitterComponent(world, group);

      createChild(world, group, { x: 40, y: 20 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      expect(world.getComponent(group, rectTransformId)!.sizeOrMargin).toEqual({
        x: 100,
        y: 100,
      });
    });

    it('fits to the measured minimum size for minSize', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 500, 500);

      addVerticalLayoutGroupComponent(world, group);
      addContentSizeFitterComponent(world, group, {
        horizontalFit: 'minSize',
        verticalFit: 'minSize',
      });

      const child = createChild(world, group, { x: 40, y: 20 });

      addLayoutElementComponent(world, child, { minWidth: 10, minHeight: 5 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      expect(world.getComponent(group, rectTransformId)!.sizeOrMargin).toEqual({
        x: 10,
        y: 5,
      });
    });

    it('fits only the axis with a non-unconstrained mode, leaving the other alone', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 500, 500);

      addVerticalLayoutGroupComponent(world, group);
      addContentSizeFitterComponent(world, group, {
        horizontalFit: 'preferredSize',
        verticalFit: 'unconstrained',
      });

      createChild(world, group, { x: 40, y: 20 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      const groupRect = world.getComponent(group, rectTransformId)!;

      expect(groupRect.sizeOrMargin.x).toBe(40);
      // Untouched - the fitter's own starting sizeOrMargin, not the group's
      // measured height.
      expect(groupRect.sizeOrMargin.y).toBe(100);
    });

    it('fits only the vertical axis, leaving an unconstrained horizontal axis alone', () => {
      const world = new EcsWorld();
      const group = createGroupEntity(world, 500, 500);

      addVerticalLayoutGroupComponent(world, group);
      addContentSizeFitterComponent(world, group, {
        horizontalFit: 'unconstrained',
        verticalFit: 'preferredSize',
      });

      createChild(world, group, { x: 40, y: 20 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      const groupRect = world.getComponent(group, rectTransformId)!;

      // Untouched - the fitter's own starting sizeOrMargin, not the group's
      // measured width.
      expect(groupRect.sizeOrMargin.x).toBe(100);
      expect(groupRect.sizeOrMargin.y).toBe(20);
    });

    it('measures an empty layout group as just its own padding', () => {
      const world = new EcsWorld();
      const padding = { left: 4, right: 6, top: 8, bottom: 10 };

      const verticalGroup = createGroupEntity(world, 500, 500);

      addVerticalLayoutGroupComponent(world, verticalGroup, { padding });
      addContentSizeFitterComponent(world, verticalGroup, {
        horizontalFit: 'preferredSize',
        verticalFit: 'preferredSize',
      });

      const horizontalGroup = createGroupEntity(world, 500, 500);

      addHorizontalLayoutGroupComponent(world, horizontalGroup, { padding });
      addContentSizeFitterComponent(world, horizontalGroup, {
        horizontalFit: 'preferredSize',
        verticalFit: 'preferredSize',
      });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      // Cross/main axis are swapped between the two directions, but an
      // empty group's own size is always just its padding, either way.
      expect(
        world.getComponent(verticalGroup, rectTransformId)!.sizeOrMargin,
      ).toEqual({ x: 10, y: 18 });
      expect(
        world.getComponent(horizontalGroup, rectTransformId)!.sizeOrMargin,
      ).toEqual({ x: 10, y: 18 });
    });

    it("measures a grid group's own content size, including when it has no children", () => {
      const world = new EcsWorld();
      const gridWithChildren = createGroupEntity(world, 500, 500);

      addGridLayoutGroupComponent(world, gridWithChildren, {
        cellSize: { x: 40, y: 30 },
        constraint: 'fixedColumnCount',
        constraintCount: 2,
      });
      addContentSizeFitterComponent(world, gridWithChildren, {
        horizontalFit: 'preferredSize',
        verticalFit: 'preferredSize',
      });

      createChild(world, gridWithChildren, { x: 1, y: 1 });
      createChild(world, gridWithChildren, { x: 1, y: 1 });
      createChild(world, gridWithChildren, { x: 1, y: 1 });

      const emptyGrid = createGroupEntity(world, 500, 500);

      addGridLayoutGroupComponent(world, emptyGrid);
      addContentSizeFitterComponent(world, emptyGrid, {
        horizontalFit: 'preferredSize',
        verticalFit: 'preferredSize',
      });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      // 2 columns, 2 rows (ceil(3 / 2)) of 40x30 cells, no spacing/padding.
      expect(
        world.getComponent(gridWithChildren, rectTransformId)!.sizeOrMargin,
      ).toEqual({ x: 80, y: 60 });
      expect(
        world.getComponent(emptyGrid, rectTransformId)!.sizeOrMargin,
      ).toEqual({ x: 0, y: 0 });
    });

    it("measures a grid group's content size as a single row when its constraint is flexible (no known content box width to fit columns into)", () => {
      const world = new EcsWorld();
      const grid = createGroupEntity(world, 500, 500);

      addGridLayoutGroupComponent(world, grid, {
        cellSize: { x: 20, y: 15 },
        spacing: { x: 5, y: 5 },
      });
      addContentSizeFitterComponent(world, grid, {
        horizontalFit: 'preferredSize',
        verticalFit: 'preferredSize',
      });

      createChild(world, grid, { x: 1, y: 1 });
      createChild(world, grid, { x: 1, y: 1 });
      createChild(world, grid, { x: 1, y: 1 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      // 3 columns (one per child), 1 row: width = 3*20 + 2*5 = 70, height = 15.
      expect(world.getComponent(grid, rectTransformId)!.sizeOrMargin).toEqual({
        x: 70,
        y: 15,
      });
    });
  });

  describe('nested groups', () => {
    it("measures a nested group's own content size when arranging the outer group", () => {
      const world = new EcsWorld();
      const outer = createGroupEntity(world, 100, 100);

      addVerticalLayoutGroupComponent(world, outer, { spacing: 0 });

      const inner = createChild(world, outer, { x: 100, y: 100 });

      addHorizontalLayoutGroupComponent(world, inner, {
        childControlWidth: false,
        childForceExpandWidth: false,
      });

      const innerChildA = createChild(world, inner, { x: 30, y: 20 });
      const innerChildB = createChild(world, inner, { x: 20, y: 15 });

      const sibling = createChild(world, outer, { x: 50, y: 60 });

      world.addSystem(createUiLayoutGroupEcsSystem());
      world.update();

      // inner is a horizontal group; its own measured width is the sum of
      // its children's widths (30 + 20 = 50), and its own measured height
      // is the max of its children's heights (max(20, 15) = 20) - not
      // inner's stale sizeOrMargin ({100, 100}) from before this ran.
      // outer force-expands its own children's widths to fill the full
      // box width (100) regardless, but the *height* distribution below
      // depends on that measured 20.
      const innerChildARect = world.getComponent(innerChildA, rectTransformId)!;
      const innerChildBRect = world.getComponent(innerChildB, rectTransformId)!;

      expect(innerChildARect.anchoredPosition.x).toBe(0);
      expect(innerChildBRect.anchoredPosition.x).toBe(30);

      // outer (vertical): main axis = height. inner's preferred height (20)
      // + sibling's preferred height (60) = 80; leftover = 20, split evenly
      // (10 each, neither sets a flexible weight): inner -> 30, sibling -> 70.
      const innerFinalRect = world.getComponent(inner, rectTransformId)!;
      const siblingRect = world.getComponent(sibling, rectTransformId)!;

      expect(innerFinalRect.sizeOrMargin.y).toBeCloseTo(30);
      expect(siblingRect.sizeOrMargin.y).toBeCloseTo(70);

      // outer's cross axis (width) force-expands both children to fill 100.
      expect(innerFinalRect.sizeOrMargin.x).toBeCloseTo(100);
      expect(siblingRect.sizeOrMargin.x).toBeCloseTo(100);
    });
  });

  describe('stability across frames', () => {
    it("doesn't oscillate when a ContentSizeFitterEcsComponent and a force-expanding cross axis share an entity", () => {
      // Regression test: a group's own RectTransformEcsComponent.rect is one
      // frame stale by design (see this system's own doc comment), so it
      // starts at Rects.zero on a brand-new entity - subtracting padding
      // from that gives a *negative* inner cross size on the very first
      // frame. Force-expanding a child to fill that negative size used to
      // write a negative sizeOrMargin into it with no floor; a
      // ContentSizeFitterEcsComponent on the same group then measured that
      // corrupted child size and fed it back into the group's own size the
      // next frame - a permanent oscillation between the corrupted and the
      // correct size, never converging, rather than a one-frame hiccup.
      const world = new EcsWorld();
      const renderContext = { width: 1920, height: 1080 } as RenderContext;

      const canvas = world.createEntity();

      addPositionComponent(world, canvas);
      addRectTransformComponent(world, canvas);

      const panel = createGroupEntity(world, 0, 0);

      addPositionComponent(world, panel);
      addParentComponent(world, panel, { parent: canvas });
      addVerticalLayoutGroupComponent(world, panel, {
        padding: { left: 24, right: 24, top: 64, bottom: 24 },
        spacing: 16,
      });
      addContentSizeFitterComponent(world, panel, {
        horizontalFit: 'preferredSize',
        verticalFit: 'preferredSize',
      });

      createChild(world, panel, { x: 220, y: 56 });
      createChild(world, panel, { x: 220, y: 56 });
      createChild(world, panel, { x: 220, y: 56 });

      const layoutGroup = createUiLayoutGroupEcsSystem();
      const layout = createUiLayoutEcsSystem(renderContext);

      world.addSystem(layoutGroup);
      world.addSystem(layout, { after: [layoutGroup] });

      const widths: number[] = [];

      for (let i = 0; i < 6; i++) {
        world.update();

        const panelRect = world.getComponent(panel, rectTransformId)!;

        widths.push(panelRect.rect.max.x - panelRect.rect.min.x);
      }

      // width = max child preferred width (220) + padding (24 + 24) = 268,
      // every frame from the very first one onward.
      expect(widths).toEqual([268, 268, 268, 268, 268, 268]);
    });
  });
});
