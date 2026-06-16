import { beforeEach, describe, expect, it } from 'vitest';
import { parentId } from '../../common/components/parent-component';
import { EcsWorld } from '../../ecs/ecs-world';
import { Matrix3x3, Rect, Vector2 } from '../../math/index';
import { uiCanvasId } from '../components/ui-canvas-component';
import {
  UiTransformEcsComponent,
  uiTransformId,
} from '../components/ui-transform-component';
import { createUiCanvas } from '../utilities/create-ui-canvas';
import { createUiLayoutEcsSystem } from './ui-layout-system';

const CANVAS_W = 800;
const CANVAS_H = 600;

function makeChildTransform(
  anchorMin: [number, number],
  anchorMax: [number, number],
  offsetMin: [number, number],
  offsetMax: [number, number],
): UiTransformEcsComponent {
  return {
    anchorMin: new Vector2(...anchorMin),
    anchorMax: new Vector2(...anchorMax),
    offsetMin: new Vector2(...offsetMin),
    offsetMax: new Vector2(...offsetMax),
    pivot: new Vector2(0.5, 0.5),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(0, 0)),
    worldMatrix: Matrix3x3.identity,
  };
}

describe('createUiLayoutEcsSystem', () => {
  let world: EcsWorld;
  let canvasEntity: number;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createUiLayoutEcsSystem());
    canvasEntity = createUiCanvas(world, {
      width: CANVAS_W,
      height: CANVAS_H,
    });
  });

  describe('canvas root', () => {
    it('resolves the canvas entity to the full viewport rect', () => {
      world.update();

      const transform = world.getComponent(canvasEntity, uiTransformId);

      expect(transform?.resolvedRect.origin.x).toBe(0);
      expect(transform?.resolvedRect.origin.y).toBe(0);
      expect(transform?.resolvedRect.size.x).toBe(CANVAS_W);
      expect(transform?.resolvedRect.size.y).toBe(CANVAS_H);
    });

    it('clears the canvas isDirty flag after resolving', () => {
      world.update();

      const canvas = world.getComponent(canvasEntity, uiCanvasId);

      expect(canvas?.isDirty).toBe(false);
    });
  });

  describe('point anchor', () => {
    it('positions a top-left anchored element by offsetMin/offsetMax', () => {
      const child = world.createEntity();

      world.addComponent(child, parentId, { parent: canvasEntity });
      world.addComponent(
        child,
        uiTransformId,
        makeChildTransform([0, 0], [0, 0], [10, 20], [110, 70]),
      );

      world.update();

      const transform = world.getComponent(child, uiTransformId);

      expect(transform?.resolvedRect.origin.x).toBeCloseTo(10);
      expect(transform?.resolvedRect.origin.y).toBeCloseTo(20);
      expect(transform?.resolvedRect.size.x).toBeCloseTo(100);
      expect(transform?.resolvedRect.size.y).toBeCloseTo(50);
    });

    it('centres an element using a centre point anchor', () => {
      const child = world.createEntity();

      world.addComponent(child, parentId, { parent: canvasEntity });
      world.addComponent(
        child,
        uiTransformId,
        makeChildTransform([0.5, 0.5], [0.5, 0.5], [-50, -25], [50, 25]),
      );

      world.update();

      const transform = world.getComponent(child, uiTransformId);
      const expectedX = CANVAS_W / 2 - 50;
      const expectedY = CANVAS_H / 2 - 25;

      expect(transform?.resolvedRect.origin.x).toBeCloseTo(expectedX);
      expect(transform?.resolvedRect.origin.y).toBeCloseTo(expectedY);
      expect(transform?.resolvedRect.size.x).toBeCloseTo(100);
      expect(transform?.resolvedRect.size.y).toBeCloseTo(50);
    });

    it('positions a bottom-right anchored element', () => {
      const child = world.createEntity();

      world.addComponent(child, parentId, { parent: canvasEntity });
      world.addComponent(
        child,
        uiTransformId,
        makeChildTransform([1, 1], [1, 1], [-100, -50], [0, 0]),
      );

      world.update();

      const transform = world.getComponent(child, uiTransformId);

      expect(transform?.resolvedRect.origin.x).toBeCloseTo(CANVAS_W - 100);
      expect(transform?.resolvedRect.origin.y).toBeCloseTo(CANVAS_H - 50);
      expect(transform?.resolvedRect.size.x).toBeCloseTo(100);
      expect(transform?.resolvedRect.size.y).toBeCloseTo(50);
    });
  });

  describe('stretch anchor', () => {
    it('stretches an element to fill the parent with margins', () => {
      const child = world.createEntity();

      world.addComponent(child, parentId, { parent: canvasEntity });
      world.addComponent(
        child,
        uiTransformId,
        makeChildTransform([0, 0], [1, 1], [10, 10], [-10, -10]),
      );

      world.update();

      const transform = world.getComponent(child, uiTransformId);

      expect(transform?.resolvedRect.origin.x).toBeCloseTo(10);
      expect(transform?.resolvedRect.origin.y).toBeCloseTo(10);
      expect(transform?.resolvedRect.size.x).toBeCloseTo(CANVAS_W - 20);
      expect(transform?.resolvedRect.size.y).toBeCloseTo(CANVAS_H - 20);
    });

    it('stretches horizontally and anchors at vertical centre', () => {
      const child = world.createEntity();

      world.addComponent(child, parentId, { parent: canvasEntity });
      world.addComponent(
        child,
        uiTransformId,
        makeChildTransform([0, 0.5], [1, 0.5], [0, -25], [0, 25]),
      );

      world.update();

      const transform = world.getComponent(child, uiTransformId);

      expect(transform?.resolvedRect.origin.x).toBeCloseTo(0);
      expect(transform?.resolvedRect.origin.y).toBeCloseTo(CANVAS_H / 2 - 25);
      expect(transform?.resolvedRect.size.x).toBeCloseTo(CANVAS_W);
      expect(transform?.resolvedRect.size.y).toBeCloseTo(50);
    });
  });

  describe('nested parents', () => {
    it('resolves a grandchild relative to its grandparent', () => {
      // Panel: left half of screen
      const panel = world.createEntity();

      world.addComponent(panel, parentId, { parent: canvasEntity });
      world.addComponent(
        panel,
        uiTransformId,
        makeChildTransform([0, 0], [0.5, 1], [0, 0], [0, 0]),
      );

      // Button: top-left corner of panel, 100×50
      const button = world.createEntity();

      world.addComponent(button, parentId, { parent: panel });
      world.addComponent(
        button,
        uiTransformId,
        makeChildTransform([0, 0], [0, 0], [0, 0], [100, 50]),
      );

      world.update();

      const panelTransform = world.getComponent(panel, uiTransformId);
      const buttonTransform = world.getComponent(button, uiTransformId);

      expect(panelTransform?.resolvedRect.size.x).toBeCloseTo(CANVAS_W / 2);
      expect(panelTransform?.resolvedRect.size.y).toBeCloseTo(CANVAS_H);

      expect(buttonTransform?.resolvedRect.origin.x).toBeCloseTo(0);
      expect(buttonTransform?.resolvedRect.origin.y).toBeCloseTo(0);
      expect(buttonTransform?.resolvedRect.size.x).toBeCloseTo(100);
      expect(buttonTransform?.resolvedRect.size.y).toBeCloseTo(50);
    });

    it('accumulates parent origin in child position', () => {
      // Panel offset 100px from left
      const panel = world.createEntity();

      world.addComponent(panel, parentId, { parent: canvasEntity });
      world.addComponent(
        panel,
        uiTransformId,
        makeChildTransform([0, 0], [0, 0], [100, 50], [400, 350]),
      );

      // Button positioned 10px from panel top-left
      const button = world.createEntity();

      world.addComponent(button, parentId, { parent: panel });
      world.addComponent(
        button,
        uiTransformId,
        makeChildTransform([0, 0], [0, 0], [10, 10], [60, 40]),
      );

      world.update();

      const buttonTransform = world.getComponent(button, uiTransformId);

      expect(buttonTransform?.resolvedRect.origin.x).toBeCloseTo(110);
      expect(buttonTransform?.resolvedRect.origin.y).toBeCloseTo(60);
      expect(buttonTransform?.resolvedRect.size.x).toBeCloseTo(50);
      expect(buttonTransform?.resolvedRect.size.y).toBeCloseTo(30);
    });
  });

  describe('pivot', () => {
    it('pivot does not affect resolvedRect', () => {
      const child = world.createEntity();
      const data = makeChildTransform(
        [0.5, 0.5],
        [0.5, 0.5],
        [-50, -25],
        [50, 25],
      );

      world.addComponent(child, parentId, { parent: canvasEntity });
      world.addComponent(child, uiTransformId, {
        ...data,
        pivot: new Vector2(0, 0),
      });

      world.update();

      const transform = world.getComponent(child, uiTransformId);
      const expectedX = CANVAS_W / 2 - 50;
      const expectedY = CANVAS_H / 2 - 25;

      expect(transform?.resolvedRect.origin.x).toBeCloseTo(expectedX);
      expect(transform?.resolvedRect.origin.y).toBeCloseTo(expectedY);
      expect(transform?.resolvedRect.size.x).toBeCloseTo(100);
      expect(transform?.resolvedRect.size.y).toBeCloseTo(50);
    });
  });

  describe('rotation', () => {
    it('rotation does not affect resolvedRect (AABB is unchanged)', () => {
      const child = world.createEntity();
      const data = makeChildTransform([0, 0], [0, 0], [0, 0], [100, 50]);

      world.addComponent(child, parentId, { parent: canvasEntity });
      world.addComponent(child, uiTransformId, {
        ...data,
        rotation: Math.PI / 4,
      });

      world.update();

      const transform = world.getComponent(child, uiTransformId);

      // Rect should still be the anchor/offset-computed rect, not rotated.
      expect(transform?.resolvedRect.origin.x).toBeCloseTo(0);
      expect(transform?.resolvedRect.origin.y).toBeCloseTo(0);
      expect(transform?.resolvedRect.size.x).toBeCloseTo(100);
      expect(transform?.resolvedRect.size.y).toBeCloseTo(50);
    });
  });

  describe('worldMatrix', () => {
    it('maps a unit quad to the resolved rect when no rotation or scale', () => {
      const child = world.createEntity();

      world.addComponent(child, parentId, { parent: canvasEntity });
      world.addComponent(
        child,
        uiTransformId,
        makeChildTransform([0, 0], [0, 0], [100, 50], [200, 150]),
      );

      world.update();

      const transform = world.getComponent(child, uiTransformId);
      const m = transform!.worldMatrix.matrix;

      // [0,0,1] → origin
      expect(m[0] * 0 + m[3] * 0 + m[6]).toBeCloseTo(100);
      expect(m[1] * 0 + m[4] * 0 + m[7]).toBeCloseTo(50);

      // [1,1,1] → origin + size
      expect(m[0] * 1 + m[3] * 1 + m[6]).toBeCloseTo(200);
      expect(m[1] * 1 + m[4] * 1 + m[7]).toBeCloseTo(150);
    });
  });

  describe('static optimisation', () => {
    it('recomputes a static entity once then freezes it', () => {
      const child = world.createEntity();

      world.addComponent(child, parentId, { parent: canvasEntity });
      world.addComponent(child, uiTransformId, {
        ...makeChildTransform([0, 0], [0, 0], [0, 0], [100, 50]),
        isStatic: true,
      });

      world.update(); // first frame: compute
      world.update(); // second frame: should skip

      // Result should still be valid from the first frame.
      const transform = world.getComponent(child, uiTransformId);

      expect(transform?.resolvedRect.size.x).toBeCloseTo(100);
    });
  });
});
