import { describe, expect, it } from 'vitest';
import { addPositionComponent, Time } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { mouseButtons } from '../../input/index.js';
import {
  addCameraComponent,
  Color,
  RenderContext,
  SpriteEcsComponent,
  Texture,
} from '../../rendering/index.js';
import {
  addCanvasComponent,
  CanvasEcsComponent,
  canvasId,
} from '../components/canvas-component.js';
import {
  addRectTransformComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import {
  addUiInteractableComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';
import {
  computeUiScrollRange,
  denormalizeUiScrollOffset,
  normalizeUiScrollOffset,
} from '../components/ui-scroll-rect-component.js';
import { UiAnchor } from '../types/ui-anchor.js';
import { UiAxis, UiStretchAxis } from '../types/ui-axis.js';
import { createScrollView } from '../utilities/create-scroll-view.js';
import { registerUiSystems } from '../utilities/register-ui-systems.js';
import { setUiFocus } from '../utilities/set-ui-focus.js';

const renderContext = {
  width: 1920,
  height: 1080,
  cssWidth: 1920,
  cssHeight: 1080,
  pixelRatio: 1,
} as RenderContext;

interface FakePointer {
  position: { x: number; y: number };
  scroll: { x: number; y: number };
  buttonsDown: Set<number>;
  buttonsUp: Set<number>;
}

const itemCount = 10;
const itemHeight = 100;

/**
 * A 400x300 scroll view centered on a 1920x1080 canvas (so the viewport
 * spans world y -150..150, and CSS pixel (960, 540) is world (0, 0)),
 * listing ten 100-tall items: the content is 1000 tall and scrolls 700.
 */
const setUp = (scrollRectOptions = {}, withScrollbar = false) => {
  const world = new EcsWorld();
  const pointer: FakePointer = {
    position: { x: 0, y: 0 },
    scroll: { x: 0, y: 0 },
    buttonsDown: new Set(),
    buttonsUp: new Set(),
  };
  const time = { deltaTimeInSeconds: 1 / 60 } as Time;

  registerUiSystems(world, renderContext, time, { pointerSource: pointer });

  const camera = world.createEntity();

  addPositionComponent(world, camera);
  addCameraComponent(world, camera, { verticalWorldUnits: 1080 });

  const canvas = world.createEntity();

  addPositionComponent(world, canvas);
  addRectTransformComponent(world, canvas);
  addCanvasComponent(world, canvas, { camera });

  const sprite: SpriteEcsComponent = {
    width: 1,
    height: 1,
    texture: {} as Texture,
    pivot: { x: 0.5, y: 0.5 },
    tintColor: Color.white,
    uvOffset: { x: 0, y: 0 },
    uvScale: { x: 1, y: 1 },
    emissive: null,
    material: null,
    category: 1,
    layer: 0,
  };
  const scrollView = createScrollView(world, canvas, {
    anchor: UiAnchor.center({ x: 400, y: 300 }),
    scrollRect: scrollRectOptions,
    ...(withScrollbar && {
      scrollbarSprite: sprite,
      scrollbarHandleSprite: sprite,
    }),
  });

  const items: number[] = [];

  for (let i = 0; i < itemCount; i++) {
    const item = world.createEntity();

    addPositionComponent(world, item);
    world.setParent(item, scrollView.content);
    addRectTransformComponent(
      world,
      item,
      UiAnchor.center({ x: 100, y: itemHeight }),
    );
    addUiInteractableComponent(world, item);
    items.push(item);
  }

  const tick = (count = 1): void => {
    for (let i = 0; i < count; i++) {
      world.update();
      pointer.buttonsDown.clear();
      pointer.buttonsUp.clear();
      pointer.scroll = { x: 0, y: 0 };
    }
  };

  // Lets the layout group and content size fitter settle.
  tick(3);

  return {
    world,
    pointer,
    time,
    canvasEntity: canvas,
    canvas: world.getComponent<CanvasEcsComponent>(canvas, canvasId)!,
    scrollView,
    items,
    tick,
  };
};

/** Presses at CSS y `fromY` and drags to `toY`, crossing the drag threshold first. */
const drag = (
  context: ReturnType<typeof setUp>,
  fromY: number,
  toY: number,
): void => {
  const { pointer, tick } = context;
  const direction = Math.sign(toY - fromY);

  pointer.position = { x: 960, y: fromY };
  pointer.buttonsDown.add(mouseButtons.left);
  tick();
  // Crossing the threshold starts the drag here.
  pointer.position = { x: 960, y: fromY + direction * 20 };
  tick();
  pointer.position = { x: 960, y: toY + direction * 20 };
  tick();
};

describe('createUiScrollRectEcsSystem', () => {
  it('sizes the content to its items', () => {
    const { world, scrollView } = setUp();
    const content = world.getComponent(scrollView.content, rectTransformId)!;

    expect(content.rect.max.y).toBeCloseTo(150);
    expect(content.rect.min.y).toBeCloseTo(150 - itemCount * itemHeight);
  });

  it('scrolls with a drag that starts on an item, without invoking it', () => {
    const context = setUp();
    const { world, pointer, scrollView, items, tick } = context;
    const item = world.getComponent(items[1], uiInteractableId)!;
    let invoked = false;

    item.onInvoke.registerListener(() => (invoked = true));

    // CSS y 540 is world y 0: the second item. Dragging up 100 CSS pixels
    // scrolls the list down by 100.
    drag(context, 540, 440);

    expect(scrollView.scrollRect.offset.y).toBeCloseTo(100);

    pointer.buttonsUp.add(mouseButtons.left);
    tick();

    expect(invoked).toBe(false);
    expect(
      world.getComponent(scrollView.content, rectTransformId)!.anchoredPosition
        .y,
    ).toBeCloseTo(scrollView.scrollRect.offset.y);
  });

  it('rubber-bands an elastic drag past the top edge and springs back on release', () => {
    const context = setUp();
    const { pointer, scrollView, tick } = context;

    drag(context, 540, 640);

    const offset = scrollView.scrollRect.offset.y;

    expect(offset).toBeLessThan(0);
    expect(offset).toBeGreaterThan(-100);

    pointer.buttonsUp.add(mouseButtons.left);
    tick(60);

    expect(scrollView.scrollRect.offset.y).toBeCloseTo(0);
  });

  it('stops a clamped drag at the edge', () => {
    const context = setUp({ movementType: 'clamped' });

    drag(context, 540, 640);

    expect(context.scrollView.scrollRect.offset.y).toBe(0);
  });

  it('coasts after a fast release and slows to a stop inside the edges', () => {
    const context = setUp();
    const { pointer, scrollView, tick } = context;

    drag(context, 540, 500);

    const released = scrollView.scrollRect.offset.y;

    expect(scrollView.scrollRect.velocity.y).toBeGreaterThan(0);

    pointer.buttonsUp.add(mouseButtons.left);
    tick();

    expect(scrollView.scrollRect.offset.y).toBeGreaterThan(released);

    tick(600);

    expect(scrollView.scrollRect.velocity.y).toBe(0);
    expect(scrollView.scrollRect.offset.y).toBeLessThanOrEqual(700);
  });

  it('stops right away on release with a deceleration rate of 0', () => {
    const context = setUp({ decelerationRate: 0 });
    const { pointer, scrollView, tick } = context;

    drag(context, 540, 500);

    const released = scrollView.scrollRect.offset.y;

    pointer.buttonsUp.add(mouseButtons.left);
    tick();

    expect(scrollView.scrollRect.offset.y).toBe(released);
  });

  it('scrolls by the wheel the same on-screen distance and stops at the edge', () => {
    const { pointer, scrollView, tick } = setUp();

    pointer.position = { x: 960, y: 540 };
    tick();
    pointer.scroll = { x: 0, y: 120 };
    tick();

    expect(scrollView.scrollRect.offset.y).toBeCloseTo(120);

    pointer.scroll = { x: 0, y: -500 };
    tick();

    expect(scrollView.scrollRect.offset.y).toBe(0);
  });

  it('ignores the wheel when the pointer is outside the viewport', () => {
    const { pointer, scrollView, tick } = setUp();

    pointer.position = { x: 100, y: 100 };
    tick();
    pointer.scroll = { x: 0, y: 120 };
    tick();

    expect(scrollView.scrollRect.offset.y).toBe(0);
  });

  it('does not scroll an axis whose content fits', () => {
    const { pointer, scrollView, tick } = setUp();

    // `createScrollView` lists vertically; the content is also narrower
    // than the viewport.
    pointer.position = { x: 960, y: 540 };
    tick();
    pointer.scroll = { x: 200, y: 0 };
    tick();

    expect(scrollView.scrollRect.offset.x).toBe(0);
  });

  it('scrolls a control focused by navigation into view, but not one focused by hover', () => {
    const { world, canvas, scrollView, items, tick } = setUp();

    setUiFocus(world, canvas, items[itemCount - 1]);
    tick();

    expect(scrollView.scrollRect.offset.y).toBeCloseTo(700);

    setUiFocus(world, canvas, items[0]);
    tick();

    expect(scrollView.scrollRect.offset.y).toBeCloseTo(0);
  });

  it('sizes and moves the scrollbar handle, and scrolls when the track is pressed', () => {
    const context = setUp({}, true);
    const { world, pointer, scrollView, tick } = context;
    const handleAxis = () =>
      world.getComponent(scrollView.verticalScrollbar!.handle, rectTransformId)!
        .y as UiStretchAxis;

    expect(handleAxis().anchorMin).toBeCloseTo(0.7);
    expect(handleAxis().anchorMax).toBeCloseTo(1);

    // The bottom of the track: world (192, -140).
    pointer.position = { x: 960 + 192, y: 540 + 140 };
    pointer.buttonsDown.add(mouseButtons.left);
    tick();

    expect(scrollView.scrollRect.offset.y).toBeCloseTo(700);

    pointer.buttonsUp.add(mouseButtons.left);
    tick(2);

    expect(handleAxis().anchorMin).toBeCloseTo(0);
    expect(handleAxis().anchorMax).toBeCloseTo(0.3);
  });

  it('raises onValueChanged with the new offset', () => {
    const { pointer, scrollView, tick } = setUp();
    const values: number[] = [];

    scrollView.scrollRect.onValueChanged.registerListener((offset) =>
      values.push(offset.y),
    );

    pointer.position = { x: 960, y: 540 };
    tick();
    pointer.scroll = { x: 0, y: 50 };
    tick();
    tick();

    expect(values).toEqual([50]);
  });

  it('stops coasting clamped content at its edge', () => {
    const { scrollView, tick } = setUp({ movementType: 'clamped' });

    scrollView.scrollRect.offset.y = 690;
    scrollView.scrollRect.velocity.y = 3000;
    tick();

    expect(scrollView.scrollRect.offset.y).toBe(700);
    expect(scrollView.scrollRect.velocity.y).toBe(0);
  });

  it('leaves released content where it is on a tick with no elapsed time', () => {
    const context = setUp();
    const { pointer, scrollView, tick, time } = context;

    drag(context, 540, 500);

    const released = scrollView.scrollRect.offset.y;

    (time as { deltaTimeInSeconds: number }).deltaTimeInSeconds = 0;
    pointer.buttonsUp.add(mouseButtons.left);
    tick();

    expect(scrollView.scrollRect.offset.y).toBe(released);
  });

  it('does not scroll when focus moves to a control outside the scroll view', () => {
    const { world, canvas, canvasEntity, scrollView, tick } = setUp();
    const outside = world.createEntity();

    addPositionComponent(world, outside);
    world.setParent(outside, canvasEntity);
    addRectTransformComponent(
      world,
      outside,
      UiAnchor.bottomCenter({ x: 100, y: 50 }),
    );
    addUiInteractableComponent(world, outside);
    tick();

    setUiFocus(world, canvas, outside);
    tick();

    expect(scrollView.scrollRect.offset.y).toBe(0);
  });

  it('lets only the innermost scroll view under the pointer take the wheel', () => {
    const { world, pointer, canvas, scrollView, tick } = setUp();
    const inner = createScrollView(world, scrollView.content, {
      anchor: UiAnchor.center({ x: 100, y: 100 }),
    });

    tick(3);

    // The inner scroll view is the eleventh item, so the content is now
    // 1100 tall and the inner view is below the viewport until the list is
    // scrolled to the bottom.
    scrollView.scrollRect.offset.y = 800;
    tick(2);

    const innerRect = world.getComponent(inner.entity, rectTransformId)!.rect;

    pointer.position = {
      x: 960 + (innerRect.min.x + innerRect.max.x) / 2,
      y: 540 - (innerRect.min.y + innerRect.max.y) / 2,
    };
    tick();

    expect(canvas.hoveredEntity).toBe(inner.entity);

    pointer.scroll = { x: 0, y: -100 };
    tick();

    expect(scrollView.scrollRect.offset.y).toBe(800);
  });

  it('ignores a scrollbar press while the content fits', () => {
    const { pointer, scrollView, tick } = setUp({ vertical: false }, true);

    pointer.position = { x: 960 + 192, y: 540 + 140 };
    pointer.buttonsDown.add(mouseButtons.left);
    tick();

    expect(scrollView.scrollRect.offset.y).toBe(0);
  });

  it('throws for content that is not a direct child of the scroll rect', () => {
    const { world, canvasEntity, scrollView, tick } = setUp();

    world.setParent(scrollView.content, canvasEntity);

    expect(() => tick()).toThrow(/direct child/);
  });

  it('throws for a scrollbar handle that is not stretched along its scrollbar', () => {
    const { world, scrollView, tick } = setUp({}, true);

    world.getComponent(
      scrollView.verticalScrollbar!.handle,
      rectTransformId,
    )!.y = UiAxis.point(0.5);

    expect(() => tick()).toThrow(/stretched along/);
  });

  it('throws for content not anchored at its top-left corner', () => {
    const { world, scrollView, tick } = setUp();
    const content = world.getComponent(scrollView.content, rectTransformId)!;

    content.y = UiAxis.point(0.5, { size: 100 });

    expect(() => tick()).toThrow(/top-left corner/);
  });
});

describe('scroll offset helpers', () => {
  const range = computeUiScrollRange(
    { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } },
    { min: { x: 0, y: -300 }, max: { x: 300, y: 100 } },
  );

  it('measures how far content can scroll', () => {
    expect(range).toEqual({ x: 200, y: 300 });
  });

  it('converts between offsets and normalized positions, y-up', () => {
    expect(normalizeUiScrollOffset({ x: 0, y: 0 }, range)).toEqual({
      x: 0,
      y: 1,
    });
    expect(normalizeUiScrollOffset({ x: -200, y: 300 }, range)).toEqual({
      x: 1,
      y: 0,
    });
    expect(denormalizeUiScrollOffset({ x: 0.5, y: 0.5 }, range)).toEqual({
      x: -100,
      y: 150,
    });
  });
});
