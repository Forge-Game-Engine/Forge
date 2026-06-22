import { describe, expect, it, vi } from 'vitest';
import { animationId } from '../../animations/components/animation-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import type { Renderable } from '../../rendering/renderable.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';
import { uiRenderableId } from '../components/ui-renderable-component.js';
import { uiScrollId } from '../components/ui-scroll-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import type { UiScrollEvent } from '../components/ui-scroll-component.js';
import {
  animateScrollTo,
  destroyWithFadeOut,
  destroyWithPopOut,
  fadeIn,
  fadeOut,
  popIn,
  popOut,
  slideIn,
  slideOut,
} from './ui-animation-presets.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRenderable(world: EcsWorld, entity: number) {
  return world.addComponent(entity, uiRenderableId, {
    renderable: null as unknown as Renderable<UiInstanceComponents>,
    enabled: true,
    tintColor: Color.white,
    borderColor: Color.transparent,
    borderWidth: 0,
    cornerRadius: 0,
    opacity: 1,
    zIndex: 0,
  });
}

function makeTransform(
  world: EcsWorld,
  entity: number,
  offsetMin = new Vector2(0, 0),
) {
  return world.addComponent(entity, uiTransformId, {
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(0, 0),
    offsetMin: offsetMin.clone(),
    offsetMax: new Vector2(100, 100),
    pivot: new Vector2(0.5, 0.5),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(100, 100)),
    worldMatrix: Matrix3x3.identity,
    isDirty: false,
  });
}

// ── Fade ──────────────────────────────────────────────────────────────────────

describe('fadeIn', () => {
  it('animates opacity from 0 to 1 with tag ui.opacity', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeRenderable(world, entity);

    fadeIn(world, entity, { duration: 100 });

    const anims = world.getComponent(entity, animationId)!.animations;

    expect(anims).toHaveLength(1);
    expect(anims[0].tag).toBe('ui.opacity');
    expect(anims[0].startValue).toBe(0);
    expect(anims[0].endValue).toBe(1);
  });

  it('calls onFinished when complete', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeRenderable(world, entity);

    const onFinished = vi.fn();
    fadeIn(world, entity, { duration: 100, onFinished });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    anim.finishedCallback();
    expect(onFinished).toHaveBeenCalled();
  });
});

describe('fadeOut', () => {
  it('animates opacity from current to 0', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = makeRenderable(world, entity);

    renderable.opacity = 0.8;
    fadeOut(world, entity, { duration: 100 });

    const anims = world.getComponent(entity, animationId)!.animations;

    expect(anims[0].startValue).toBe(0.8);
    expect(anims[0].endValue).toBe(0);
  });
});

// ── Pop ───────────────────────────────────────────────────────────────────────

describe('popIn', () => {
  it('starts both a scale and opacity animation', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeRenderable(world, entity);
    makeTransform(world, entity);

    popIn(world, entity, { duration: 200 });

    const anims = world.getComponent(entity, animationId)!.animations;
    const scaleAnim = anims.find((a) => a.tag === 'ui.scale');
    const opacityAnim = anims.find((a) => a.tag === 'ui.opacity');

    expect(scaleAnim).toBeDefined();
    expect(opacityAnim).toBeDefined();
    expect(scaleAnim!.startValue).toBe(0);
    expect(scaleAnim!.endValue).toBe(1);
    expect(opacityAnim!.startValue).toBe(0);
    expect(opacityAnim!.endValue).toBe(1);
  });
});

describe('popOut', () => {
  it('starts both a scale (1→0) and opacity (1→0) animation', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeRenderable(world, entity);
    makeTransform(world, entity);

    popOut(world, entity, { duration: 200 });

    const anims = world.getComponent(entity, animationId)!.animations;
    const scaleAnim = anims.find((a) => a.tag === 'ui.scale');
    const opacityAnim = anims.find((a) => a.tag === 'ui.opacity');

    expect(scaleAnim!.startValue).toBe(1);
    expect(scaleAnim!.endValue).toBe(0);
    expect(opacityAnim!.startValue).toBe(1);
    expect(opacityAnim!.endValue).toBe(0);
  });
});

// ── Slide ─────────────────────────────────────────────────────────────────────

describe('slideIn', () => {
  it('from right: offsets transform left then animates back to natural X', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const transform = makeTransform(world, entity, new Vector2(50, 0));

    slideIn(world, entity, {
      direction: 'right',
      distance: 100,
      duration: 200,
    });

    // Transform should be offset to the start position
    expect(transform.offsetMin.x).toBe(-50); // 50 - 100
    expect(transform.isDirty).toBe(true);

    const anim = world
      .getComponent(entity, animationId)!
      .animations.find((a) => a.tag === 'ui.offsetMin.x');

    expect(anim).toBeDefined();
    expect(anim!.startValue).toBe(-50);
    expect(anim!.endValue).toBe(50);
  });

  it('from left: offsets transform right then animates to natural X', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const transform = makeTransform(world, entity, new Vector2(0, 0));

    slideIn(world, entity, { direction: 'left', distance: 80, duration: 200 });

    expect(transform.offsetMin.x).toBe(80);
    const anim = world
      .getComponent(entity, animationId)!
      .animations.find((a) => a.tag === 'ui.offsetMin.x');
    expect(anim!.endValue).toBe(0);
  });

  it('from down: animates offsetMin.y', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeTransform(world, entity);

    slideIn(world, entity, { direction: 'down', distance: 50, duration: 100 });

    const anim = world
      .getComponent(entity, animationId)!
      .animations.find((a) => a.tag === 'ui.offsetMin.y');
    expect(anim).toBeDefined();
  });

  it('does nothing when entity has no UiTransformEcsComponent', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(() => slideIn(world, entity, { direction: 'right' })).not.toThrow();
    expect(world.getComponent(entity, animationId)).toBeNull();
  });
});

describe('slideOut', () => {
  it('from right: animates offsetMin.x forward by distance', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeTransform(world, entity, new Vector2(10, 0));

    slideOut(world, entity, {
      direction: 'right',
      distance: 100,
      duration: 200,
    });

    const anim = world
      .getComponent(entity, animationId)!
      .animations.find((a) => a.tag === 'ui.offsetMin.x');

    expect(anim!.startValue).toBe(10);
    expect(anim!.endValue).toBe(110);
  });
});

// ── Scroll animation ──────────────────────────────────────────────────────────

describe('animateScrollTo', () => {
  it('pushes scroll.x and scroll.y animations onto viewport entity', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const scrollComp = world.addComponent(entity, uiScrollId, {
      scroll: new Vector2(0, 0),
      contentSize: new Vector2(0, 500),
      viewportSize: new Vector2(0, 200),
      orientation: 'vertical',
      onScroll: new ParameterizedForgeEvent<UiScrollEvent>('scroll'),
      contentEntity: 0,
    });

    animateScrollTo(world, entity, new Vector2(0, 300), { duration: 200 });

    const anims = world.getComponent(entity, animationId)!.animations;
    const xAnim = anims.find((a) => a.tag === 'ui.scroll.x');
    const yAnim = anims.find((a) => a.tag === 'ui.scroll.y');

    expect(xAnim).toBeDefined();
    expect(yAnim).toBeDefined();
    expect(yAnim!.startValue).toBe(0);
    expect(yAnim!.endValue).toBe(300);

    // updateCallback should write to the scroll component
    yAnim!.updateCallback(150);
    expect(scrollComp.scroll.y).toBe(150);
  });

  it('does nothing when entity has no UiScrollEcsComponent', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(() =>
      animateScrollTo(world, entity, new Vector2(0, 100)),
    ).not.toThrow();
  });
});

// ── Exit + destroy ────────────────────────────────────────────────────────────

describe('destroyWithFadeOut', () => {
  it('destroys the entity subtree in the onFinished callback', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeRenderable(world, entity);

    destroyWithFadeOut(world, entity, { duration: 100 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    // Verify the entity is alive before callback fires
    expect(world.getComponent(entity, uiRenderableId)).not.toBeNull();

    anim.finishedCallback();

    // After finishedCallback the entity should be destroyed
    expect(world.getComponent(entity, uiRenderableId)).toBeNull();
  });
});

describe('destroyWithPopOut', () => {
  it('destroys entity in the opacity finishedCallback', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeRenderable(world, entity);
    makeTransform(world, entity);

    destroyWithPopOut(world, entity, { duration: 100 });

    const anims = world.getComponent(entity, animationId)!.animations;
    const opacityAnim = anims.find((a) => a.tag === 'ui.opacity');

    expect(opacityAnim).toBeDefined();
    opacityAnim!.finishedCallback();
    expect(world.getComponent(entity, uiRenderableId)).toBeNull();
  });
});
