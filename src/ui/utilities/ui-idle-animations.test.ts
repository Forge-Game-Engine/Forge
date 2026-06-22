import { describe, expect, it } from 'vitest';
import { animationId } from '../../animations/components/animation-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import type { Renderable } from '../../rendering/renderable.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';
import { uiRenderableId } from '../components/ui-renderable-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import {
  startCaretBlink,
  startFocusPulse,
  startLoadingSpinner,
} from './ui-idle-animations.js';

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

function makeTransform(world: EcsWorld, entity: number) {
  return world.addComponent(entity, uiTransformId, {
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(0, 0),
    offsetMin: new Vector2(0, 0),
    offsetMax: new Vector2(100, 100),
    pivot: new Vector2(0.5, 0.5),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(100, 100)),
    worldMatrix: Matrix3x3.identity,
    isDirty: false,
  });
}

// ── startCaretBlink ───────────────────────────────────────────────────────────

describe('startCaretBlink', () => {
  it('pushes a pingpong opacity animation with infinite loop', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeRenderable(world, entity);

    startCaretBlink(world, entity);

    const anim = world.getComponent(entity, animationId)!.animations[0];

    expect(anim.tag).toBe('ui.opacity');
    expect(anim.loop).toBe('pingpong');
    expect(anim.loopCount).toBe(-1);
    expect(anim.startValue).toBe(1);
    expect(anim.endValue).toBe(0); // default minOpacity = 0
  });

  it('uses custom period and minOpacity', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeRenderable(world, entity);

    startCaretBlink(world, entity, { period: 800, minOpacity: 0.2 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    expect(anim.duration).toBe(400); // period / 2
    expect(anim.endValue).toBe(0.2);
  });

  it('stop function cancels the animation', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeRenderable(world, entity);

    const stop = startCaretBlink(world, entity);

    expect(world.getComponent(entity, animationId)!.animations).toHaveLength(1);

    stop();

    expect(world.getComponent(entity, animationId)!.animations).toHaveLength(0);
  });
});

// ── startFocusPulse ───────────────────────────────────────────────────────────

describe('startFocusPulse', () => {
  it('pushes a pingpong borderWidth animation with infinite loop', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeRenderable(world, entity);

    startFocusPulse(world, entity);

    const anim = world.getComponent(entity, animationId)!.animations[0];

    expect(anim.tag).toBe('ui.borderWidth');
    expect(anim.loop).toBe('pingpong');
    expect(anim.loopCount).toBe(-1);
    expect(anim.endValue).toBe(3); // default maxBorderWidth
  });

  it('uses custom period and maxBorderWidth', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeRenderable(world, entity);

    startFocusPulse(world, entity, { period: 2000, maxBorderWidth: 4 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    expect(anim.duration).toBe(1000); // period / 2
    expect(anim.endValue).toBe(4);
  });

  it('stop function cancels the animation', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeRenderable(world, entity);

    const stop = startFocusPulse(world, entity);

    stop();

    expect(world.getComponent(entity, animationId)!.animations).toHaveLength(0);
  });
});

// ── startLoadingSpinner ───────────────────────────────────────────────────────

describe('startLoadingSpinner', () => {
  it('pushes a loop rotation animation (0 to 2π) with infinite loop', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeTransform(world, entity);

    startLoadingSpinner(world, entity);

    const anim = world.getComponent(entity, animationId)!.animations[0];

    expect(anim.tag).toBe('ui.rotation');
    expect(anim.loop).toBe('loop');
    expect(anim.loopCount).toBe(-1);
    expect(anim.startValue).toBe(0);
    expect(anim.endValue).toBeCloseTo(Math.PI * 2);
  });

  it('uses custom period', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeTransform(world, entity);

    startLoadingSpinner(world, entity, { period: 600 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    expect(anim.duration).toBe(600);
  });

  it('stop function cancels the animation', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeTransform(world, entity);

    const stop = startLoadingSpinner(world, entity);

    stop();

    expect(world.getComponent(entity, animationId)!.animations).toHaveLength(0);
  });

  it('rotation updateCallback writes to transform.rotation', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const transform = makeTransform(world, entity);

    startLoadingSpinner(world, entity);

    const anim = world.getComponent(entity, animationId)!.animations[0];

    anim.updateCallback(Math.PI);
    expect(transform.rotation).toBeCloseTo(Math.PI);
    expect(transform.isDirty).toBe(true);
  });
});
