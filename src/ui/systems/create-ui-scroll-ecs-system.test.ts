import { describe, expect, it } from 'vitest';
import { parentId } from '../../common/components/parent-component';
import { EcsWorld } from '../../ecs/ecs-world';
import { Axis1dAction } from '../../input/actions/axis-1d-action';
import { InputManager } from '../../input/input-manager';
import { Matrix3x3, Rect, Vector2 } from '../../math/index';
import { Renderable } from '../../rendering/renderable';
import { uiCanvasId } from '../components/ui-canvas-component';
import { uiFocusId } from '../components/ui-focus-component';
import { UiInstanceComponents } from '../components/ui-instance-components';
import { uiPointerStateId } from '../components/ui-pointer-state-component';
import { uiTransformId } from '../components/ui-transform-component';
import { uiScrollId } from '../components/ui-scroll-component';
import { createUiScrollEcsSystem } from './create-ui-scroll-ecs-system';
import { createUiScrollGroup } from '../utilities/create-ui-scroll-group';
import { registerUiInputActions } from '../utilities/register-ui-input-actions';

const mockRenderable = {} as Renderable<UiInstanceComponents>;

function makeWorld(): {
  world: EcsWorld;
  inputManager: InputManager;
  scrollYAction: Axis1dAction;
  canvas: number;
} {
  const world = new EcsWorld();
  const inputManager = new InputManager();
  const actions = registerUiInputActions(inputManager);

  world.addSystem(createUiScrollEcsSystem(inputManager));

  const canvas = world.createEntity();

  world.addComponent(canvas, uiCanvasId, {
    width: 800,
    height: 600,
    devicePixelRatio: 1,
    referenceResolution: new Vector2(800, 600),
    scaleMode: 'constant-pixel',
    isDirty: false,
  });

  world.addComponent(canvas, uiFocusId, { focused: null, focusRing: false });

  world.addComponent(canvas, uiPointerStateId, {
    hovered: null,
    pressed: null,
    pointer: new Vector2(0, 0),
  });

  return { world, inputManager, scrollYAction: actions.scrollY, canvas };
}

function makeScrollGroup(
  world: EcsWorld,
  canvas: number,
  viewportHeight = 200,
  contentHeight = 600,
): {
  viewportEntity: number;
  contentEntity: number;
  viewportResolvedRect: Rect;
} {
  const result = createUiScrollGroup(world, {
    renderable: mockRenderable,
    contentRenderable: mockRenderable,
    rect: { x: 0, y: 0, width: 300, height: viewportHeight },
    contentSize: new Vector2(300, contentHeight),
    parent: canvas,
  });

  // Manually set resolvedRect to simulate layout computation
  const viewportTransform = world.getComponent(result.entity, uiTransformId)!;
  const viewportRect = new Rect(
    new Vector2(0, 0),
    new Vector2(300, viewportHeight),
  );
  viewportTransform.resolvedRect = viewportRect;
  viewportTransform.worldMatrix = Matrix3x3.identity;

  return {
    viewportEntity: result.entity,
    contentEntity: result.contentEntity,
    viewportResolvedRect: viewportRect,
  };
}

describe('createUiScrollEcsSystem', () => {
  describe('wheel scrolling', () => {
    it('scrolls down when wheel delta is positive and pointer is over viewport', () => {
      const { world, scrollYAction, canvas } = makeWorld();
      const { viewportEntity } = makeScrollGroup(world, canvas);

      // Pointer over viewport
      const pointerState = world.getComponent(canvas, uiPointerStateId)!;
      pointerState.hovered = viewportEntity;

      // Wheel down
      scrollYAction.set(1);
      world.update();

      const scroll = world.getComponent(viewportEntity, uiScrollId)!;
      expect(scroll.scroll.y).toBeGreaterThan(0);
    });

    it('does not scroll when pointer is not over viewport', () => {
      const { world, scrollYAction, canvas } = makeWorld();
      const { viewportEntity } = makeScrollGroup(world, canvas);

      // Pointer not over viewport
      const pointerState = world.getComponent(canvas, uiPointerStateId)!;
      pointerState.hovered = null;

      scrollYAction.set(1);
      world.update();

      const scroll = world.getComponent(viewportEntity, uiScrollId)!;
      expect(scroll.scroll.y).toBe(0);
    });

    it('does not scroll below 0', () => {
      const { world, scrollYAction, canvas } = makeWorld();
      const { viewportEntity } = makeScrollGroup(world, canvas);

      const pointerState = world.getComponent(canvas, uiPointerStateId)!;
      pointerState.hovered = viewportEntity;

      // Wheel up (negative delta)
      scrollYAction.set(-5);
      world.update();

      const scroll = world.getComponent(viewportEntity, uiScrollId)!;
      expect(scroll.scroll.y).toBe(0);
    });

    it('clamps scroll to contentSize - viewportSize', () => {
      const { world, scrollYAction, canvas } = makeWorld();
      const { viewportEntity } = makeScrollGroup(world, canvas, 200, 600);

      const pointerState = world.getComponent(canvas, uiPointerStateId)!;
      pointerState.hovered = viewportEntity;

      // Very large scroll delta
      scrollYAction.set(1000);
      world.update();

      const scroll = world.getComponent(viewportEntity, uiScrollId)!;
      expect(scroll.scroll.y).toBe(400); // 600 - 200
    });
  });

  describe('content offset application', () => {
    it('updates content entity offsetMin.y to -scroll.y after scrolling', () => {
      const { world, scrollYAction, canvas } = makeWorld();
      const { viewportEntity, contentEntity } = makeScrollGroup(world, canvas);

      const pointerState = world.getComponent(canvas, uiPointerStateId)!;
      pointerState.hovered = viewportEntity;
      scrollYAction.set(1); // delta of 1 → 40px scroll
      world.update();

      const contentTransform = world.getComponent(
        contentEntity,
        uiTransformId,
      )!;
      const scroll = world.getComponent(viewportEntity, uiScrollId)!;
      expect(contentTransform.offsetMin.y).toBe(-scroll.scroll.y);
    });
  });

  describe('ensure-visible', () => {
    it('adjusts scroll when focused entity is below viewport', () => {
      const { world, canvas } = makeWorld();
      const { viewportEntity, contentEntity } = makeScrollGroup(
        world,
        canvas,
        200,
        600,
      );

      // Create a child entity at the bottom of the content
      const childEntity = world.createEntity();
      world.addComponent(childEntity, uiTransformId, {
        anchorMin: new Vector2(0, 0),
        anchorMax: new Vector2(0, 0),
        offsetMin: new Vector2(0, 0),
        offsetMax: new Vector2(0, 0),
        pivot: new Vector2(0, 0),
        rotation: 0,
        scale: new Vector2(1, 1),
        resolvedRect: new Rect(new Vector2(0, 500), new Vector2(100, 50)),
        worldMatrix: Matrix3x3.identity,
        isDirty: false,
      });

      // Make the child a descendant of content
      world.addComponent(childEntity, parentId, {
        parent: contentEntity,
      });

      // Focus the child
      const focusComp = world.getComponent(canvas, uiFocusId)!;
      focusComp.focused = childEntity;

      // Set viewport resolvedRect
      const viewportTransform = world.getComponent(
        viewportEntity,
        uiTransformId,
      )!;
      viewportTransform.resolvedRect = new Rect(
        new Vector2(0, 0),
        new Vector2(300, 200),
      );

      world.update();

      const scroll = world.getComponent(viewportEntity, uiScrollId)!;
      // Child bottom is at 550 (500+50), viewport bottom is at 200. Need to scroll by 350.
      expect(scroll.scroll.y).toBeGreaterThan(0);
    });

    it('does not adjust scroll when focused entity is already in view', () => {
      const { world, canvas } = makeWorld();
      const { viewportEntity, contentEntity } = makeScrollGroup(
        world,
        canvas,
        200,
        600,
      );

      const childEntity = world.createEntity();
      world.addComponent(childEntity, uiTransformId, {
        anchorMin: new Vector2(0, 0),
        anchorMax: new Vector2(0, 0),
        offsetMin: new Vector2(0, 0),
        offsetMax: new Vector2(0, 0),
        pivot: new Vector2(0, 0),
        rotation: 0,
        scale: new Vector2(1, 1),
        // Child is within the viewport (0-100, viewport is 0-200)
        resolvedRect: new Rect(new Vector2(0, 10), new Vector2(100, 50)),
        worldMatrix: Matrix3x3.identity,
        isDirty: false,
      });

      world.addComponent(childEntity, parentId, {
        parent: contentEntity,
      });

      const focusComp = world.getComponent(canvas, uiFocusId)!;
      focusComp.focused = childEntity;

      const viewportTransform = world.getComponent(
        viewportEntity,
        uiTransformId,
      )!;
      viewportTransform.resolvedRect = new Rect(
        new Vector2(0, 0),
        new Vector2(300, 200),
      );

      world.update();

      const scroll = world.getComponent(viewportEntity, uiScrollId)!;
      expect(scroll.scroll.y).toBe(0);
    });
  });

  describe('onScroll event', () => {
    it('fires onScroll event when scroll changes', () => {
      const { world, scrollYAction, canvas } = makeWorld();
      const { viewportEntity } = makeScrollGroup(world, canvas);

      const received: number[] = [];
      const scroll = world.getComponent(viewportEntity, uiScrollId)!;
      scroll.onScroll.registerListener((e) => received.push(e.entity));

      const pointerState = world.getComponent(canvas, uiPointerStateId)!;
      pointerState.hovered = viewportEntity;
      scrollYAction.set(1);
      world.update();

      expect(received).toHaveLength(1);
      expect(received[0]).toBe(viewportEntity);
    });

    it('does not fire onScroll when scroll does not change', () => {
      const { world, canvas } = makeWorld();
      const { viewportEntity } = makeScrollGroup(world, canvas);

      const received: number[] = [];
      const scroll = world.getComponent(viewportEntity, uiScrollId)!;
      scroll.onScroll.registerListener((e) => received.push(e.entity));

      world.update();

      expect(received).toHaveLength(0);
    });
  });
});
