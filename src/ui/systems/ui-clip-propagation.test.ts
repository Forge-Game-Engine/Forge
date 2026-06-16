import { beforeEach, describe, expect, it } from 'vitest';
import { parentId } from '../../common/components/parent-component';
import { EcsWorld } from '../../ecs/ecs-world';
import { Matrix3x3, Rect, Vector2 } from '../../math/index';
import { uiClipId } from '../components/ui-clip-component';
import { uiTransformId } from '../components/ui-transform-component';
import { createUiCanvas } from '../utilities/create-ui-canvas';
import { createUiLayoutEcsSystem } from './ui-layout-system';

const CANVAS_W = 800;
const CANVAS_H = 600;

function addChild(
  world: EcsWorld,
  parent: number,
  anchorMin: [number, number],
  anchorMax: [number, number],
  offsetMin: [number, number],
  offsetMax: [number, number],
): number {
  const entity = world.createEntity();

  world.addComponent(entity, parentId, { parent });
  world.addComponent(entity, uiTransformId, {
    anchorMin: new Vector2(...anchorMin),
    anchorMax: new Vector2(...anchorMax),
    offsetMin: new Vector2(...offsetMin),
    offsetMax: new Vector2(...offsetMax),
    pivot: new Vector2(0.5, 0.5),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(0, 0)),
    worldMatrix: Matrix3x3.identity,
  });

  return entity;
}

describe('UI clip-rect propagation', () => {
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

  it('canvas entity has null clipRect', () => {
    world.update();

    const transform = world.getComponent(canvasEntity, uiTransformId);

    expect(transform!.clipRect).toBeNull();
  });

  it('child without clip ancestor has null clipRect', () => {
    const child = addChild(world, canvasEntity, [0, 0], [1, 1], [0, 0], [0, 0]);

    world.update();

    const transform = world.getComponent(child, uiTransformId);

    expect(transform!.clipRect).toBeNull();
  });

  it('child of a clip entity inherits the clip rect', () => {
    // Panel at (100, 100), size 200×200
    const panel = addChild(
      world,
      canvasEntity,
      [0, 0],
      [0, 0],
      [100, 100],
      [300, 300],
    );

    world.addComponent(panel, uiClipId, { enabled: true });

    // Child that spans the full canvas
    const child = addChild(world, panel, [0, 0], [1, 1], [0, 0], [0, 0]);

    world.update();

    const childTransform = world.getComponent(child, uiTransformId);

    expect(childTransform!.clipRect).not.toBeNull();
    expect(childTransform!.clipRect!.origin.x).toBeCloseTo(100);
    expect(childTransform!.clipRect!.origin.y).toBeCloseTo(100);
    expect(childTransform!.clipRect!.size.x).toBeCloseTo(200);
    expect(childTransform!.clipRect!.size.y).toBeCloseTo(200);
  });

  it('nested clip rects intersect correctly', () => {
    // Outer panel: (0,0) to (200,200)
    const outer = addChild(
      world,
      canvasEntity,
      [0, 0],
      [0, 0],
      [0, 0],
      [200, 200],
    );

    world.addComponent(outer, uiClipId, { enabled: true });

    // Inner panel: (100,100) to (300,300) — extends outside outer
    const inner = addChild(
      world,
      outer,
      [0, 0],
      [0, 0],
      [100, 100],
      [400, 400],
    );

    world.addComponent(inner, uiClipId, { enabled: true });

    // Grandchild spans full canvas
    const grandchild = addChild(world, inner, [0, 0], [1, 1], [0, 0], [0, 0]);

    world.update();

    const grandchildTransform = world.getComponent(grandchild, uiTransformId);

    expect(grandchildTransform!.clipRect).not.toBeNull();
    // Intersection of (0,0,200,200) and inner's resolvedRect (100,100 to ~300,300 clamped to outer)
    // inner clipRect = intersection(outer.resolvedRect, outer.clipRect=null) = (0,0,200,200)
    // grandchild clipRect = intersection(inner.resolvedRect, inner.clipRect)
    //   inner.resolvedRect = (100,100,200,200) (clamped by inner's anchor/offset, not by clip)
    //   inner.clipRect = (0,0,200,200)
    //   intersection = (100,100,100,100)
    expect(grandchildTransform!.clipRect!.origin.x).toBeCloseTo(100);
    expect(grandchildTransform!.clipRect!.origin.y).toBeCloseTo(100);
    expect(grandchildTransform!.clipRect!.size.x).toBeCloseTo(100);
    expect(grandchildTransform!.clipRect!.size.y).toBeCloseTo(100);
  });

  it('disabled clip component does not clip children', () => {
    const panel = addChild(
      world,
      canvasEntity,
      [0, 0],
      [0, 0],
      [100, 100],
      [300, 300],
    );

    world.addComponent(panel, uiClipId, { enabled: false });

    const child = addChild(world, panel, [0, 0], [1, 1], [0, 0], [0, 0]);

    world.update();

    const childTransform = world.getComponent(child, uiTransformId);

    expect(childTransform!.clipRect).toBeNull();
  });
});
