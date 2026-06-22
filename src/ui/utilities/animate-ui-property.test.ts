import { describe, expect, it, vi } from 'vitest';
import { animationId } from '../../animations/components/animation-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import type { Renderable } from '../../rendering/renderable.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';
import { uiRenderableId } from '../components/ui-renderable-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import {
  animateUiBorderColor,
  animateUiBorderWidth,
  animateUiCornerRadius,
  animateUiOffsetMaxX,
  animateUiOffsetMaxY,
  animateUiOffsetMinX,
  animateUiOffsetMinY,
  animateUiOpacity,
  animateUiProperty,
  animateUiRotation,
  animateUiScale,
  animateUiScaleX,
  animateUiScaleY,
  animateUiTintColor,
  cancelUiPropertyAnimation,
} from './animate-ui-property.js';

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

// ── Core helper ───────────────────────────────────────────────────────────────

describe('animateUiProperty', () => {
  it('creates AnimationEcsComponent when absent and pushes animation', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    animateUiProperty(world, entity, {
      to: 1,
      duration: 200,
      updateCallback: vi.fn(),
    });

    const animComp = world.getComponent(entity, animationId);

    expect(animComp).not.toBeNull();
    expect(animComp!.animations).toHaveLength(1);
  });

  it('reuses existing AnimationEcsComponent', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    world.addComponent(entity, animationId, { animations: [] });

    animateUiProperty(world, entity, {
      to: 1,
      duration: 200,
      updateCallback: vi.fn(),
    });
    animateUiProperty(world, entity, {
      to: 2,
      duration: 200,
      updateCallback: vi.fn(),
    });

    expect(world.getComponent(entity, animationId)!.animations).toHaveLength(2);
  });

  it('stores the tag on the created animation', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    animateUiProperty(world, entity, {
      tag: 'test.prop',
      to: 1,
      duration: 100,
      updateCallback: vi.fn(),
    });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    expect(anim.tag).toBe('test.prop');
  });

  it('cancels existing animation with same tag before pushing new one', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    animateUiProperty(world, entity, {
      tag: 'prop',
      to: 1,
      duration: 200,
      updateCallback: vi.fn(),
    });
    animateUiProperty(world, entity, {
      tag: 'prop',
      to: 2,
      duration: 200,
      updateCallback: vi.fn(),
    });

    const anims = world.getComponent(entity, animationId)!.animations;

    expect(anims).toHaveLength(1);
    expect(anims[0].endValue).toBe(2);
  });

  it('does not cancel animations with different tags', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    animateUiProperty(world, entity, {
      tag: 'a',
      to: 1,
      duration: 200,
      updateCallback: vi.fn(),
    });
    animateUiProperty(world, entity, {
      tag: 'b',
      to: 2,
      duration: 200,
      updateCallback: vi.fn(),
    });

    expect(world.getComponent(entity, animationId)!.animations).toHaveLength(2);
  });
});

// ── cancelUiPropertyAnimation ─────────────────────────────────────────────────

describe('cancelUiPropertyAnimation', () => {
  it('removes animations with the matching tag', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    animateUiProperty(world, entity, {
      tag: 'target',
      to: 1,
      duration: 100,
      updateCallback: vi.fn(),
    });
    animateUiProperty(world, entity, {
      tag: 'other',
      to: 2,
      duration: 100,
      updateCallback: vi.fn(),
    });

    cancelUiPropertyAnimation(world, entity, 'target');

    const anims = world.getComponent(entity, animationId)!.animations;

    expect(anims).toHaveLength(1);
    expect(anims[0].tag).toBe('other');
  });

  it('does nothing when no AnimationEcsComponent exists', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(() => cancelUiPropertyAnimation(world, entity, 'tag')).not.toThrow();
  });

  it('does nothing for empty tag', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    animateUiProperty(world, entity, {
      tag: '',
      to: 1,
      duration: 100,
      updateCallback: vi.fn(),
    });

    cancelUiPropertyAnimation(world, entity, '');

    expect(world.getComponent(entity, animationId)!.animations).toHaveLength(1);
  });
});

// ── Renderable wrappers ───────────────────────────────────────────────────────

describe('animateUiOpacity', () => {
  it('pushes animation with tag ui.opacity and writes to opacity', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = makeRenderable(world, entity);

    renderable.opacity = 1;
    animateUiOpacity(world, entity, { from: 1, to: 0, duration: 100 });

    const anims = world.getComponent(entity, animationId)!.animations;

    expect(anims).toHaveLength(1);
    expect(anims[0].tag).toBe('ui.opacity');
    expect(anims[0].startValue).toBe(1);
    expect(anims[0].endValue).toBe(0);

    anims[0].updateCallback(0.5);

    expect(renderable.opacity).toBe(0.5);
  });

  it('reads current opacity when from is omitted', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = makeRenderable(world, entity);

    renderable.opacity = 0.7;
    animateUiOpacity(world, entity, { to: 0, duration: 100 });

    expect(
      world.getComponent(entity, animationId)!.animations[0].startValue,
    ).toBe(0.7);
  });

  it('does nothing when entity has no UiRenderableEcsComponent', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(() =>
      animateUiOpacity(world, entity, { to: 0, duration: 100 }),
    ).not.toThrow();
    expect(world.getComponent(entity, animationId)).toBeNull();
  });
});

describe('animateUiCornerRadius', () => {
  it('pushes animation with tag ui.cornerRadius and writes to cornerRadius', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = makeRenderable(world, entity);

    renderable.cornerRadius = 0;
    animateUiCornerRadius(world, entity, { to: 8, duration: 100 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    expect(anim.tag).toBe('ui.cornerRadius');
    anim.updateCallback(8);
    expect(renderable.cornerRadius).toBe(8);
  });
});

describe('animateUiBorderWidth', () => {
  it('pushes animation with tag ui.borderWidth and writes to borderWidth', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = makeRenderable(world, entity);

    renderable.borderWidth = 0;
    animateUiBorderWidth(world, entity, { to: 2, duration: 100 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    expect(anim.tag).toBe('ui.borderWidth');
    anim.updateCallback(2);
    expect(renderable.borderWidth).toBe(2);
  });
});

describe('animateUiTintColor', () => {
  it('lerps tintColor from fromColor to toColor via 0→1 driver', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = makeRenderable(world, entity);

    const from = Color.white;
    const to = Color.black;

    animateUiTintColor(world, entity, { from, to, duration: 100 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    expect(anim.tag).toBe('ui.tintColor');
    expect(anim.startValue).toBe(0);
    expect(anim.endValue).toBe(1);

    anim.updateCallback(0);
    expect(renderable.tintColor.r).toBeCloseTo(1);

    anim.updateCallback(1);
    expect(renderable.tintColor.r).toBeCloseTo(0);

    anim.updateCallback(0.5);
    expect(renderable.tintColor.r).toBeCloseTo(0.5);
  });

  it('reads current tintColor when from is omitted', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    makeRenderable(world, entity);

    animateUiTintColor(world, entity, { to: Color.black, duration: 100 });

    expect(world.getComponent(entity, animationId)!.animations).toHaveLength(1);
  });
});

describe('animateUiBorderColor', () => {
  it('lerps borderColor via 0→1 driver', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = makeRenderable(world, entity);

    renderable.borderColor = Color.transparent;
    animateUiBorderColor(world, entity, {
      from: Color.transparent,
      to: new Color(0.2, 0.5, 1.0),
      duration: 100,
    });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    expect(anim.tag).toBe('ui.borderColor');
    anim.updateCallback(1);
    expect(renderable.borderColor.r).toBeCloseTo(0.2);
  });
});

// ── Transform wrappers ────────────────────────────────────────────────────────

describe('animateUiScale', () => {
  it('animates both scale.x and scale.y and marks isDirty', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const transform = makeTransform(world, entity);

    animateUiScale(world, entity, { from: 1, to: 0, duration: 100 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    expect(anim.tag).toBe('ui.scale');
    anim.updateCallback(0.5);
    expect(transform.scale.x).toBe(0.5);
    expect(transform.scale.y).toBe(0.5);
    expect(transform.isDirty).toBe(true);
  });
});

describe('animateUiScaleX', () => {
  it('animates only scale.x', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const transform = makeTransform(world, entity);

    animateUiScaleX(world, entity, { from: 1, to: 0, duration: 100 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    anim.updateCallback(0.3);
    expect(transform.scale.x).toBe(0.3);
    expect(transform.scale.y).toBe(1); // unchanged
  });
});

describe('animateUiScaleY', () => {
  it('animates only scale.y', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const transform = makeTransform(world, entity);

    animateUiScaleY(world, entity, { from: 1, to: 0, duration: 100 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    anim.updateCallback(0.4);
    expect(transform.scale.y).toBe(0.4);
    expect(transform.scale.x).toBe(1); // unchanged
  });
});

describe('animateUiRotation', () => {
  it('animates rotation and marks isDirty', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const transform = makeTransform(world, entity);

    animateUiRotation(world, entity, { from: 0, to: Math.PI, duration: 100 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    anim.updateCallback(Math.PI / 2);
    expect(transform.rotation).toBeCloseTo(Math.PI / 2);
    expect(transform.isDirty).toBe(true);
  });
});

describe('animateUiOffsetMinX', () => {
  it('animates offsetMin.x and marks isDirty', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const transform = makeTransform(world, entity);

    animateUiOffsetMinX(world, entity, { from: -100, to: 0, duration: 100 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    anim.updateCallback(-50);
    expect(transform.offsetMin.x).toBe(-50);
    expect(transform.isDirty).toBe(true);
  });
});

describe('animateUiOffsetMinY', () => {
  it('animates offsetMin.y', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const transform = makeTransform(world, entity);

    animateUiOffsetMinY(world, entity, { from: 50, to: 0, duration: 100 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    anim.updateCallback(25);
    expect(transform.offsetMin.y).toBe(25);
  });
});

describe('animateUiOffsetMaxX', () => {
  it('animates offsetMax.x', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const transform = makeTransform(world, entity);

    animateUiOffsetMaxX(world, entity, { from: 100, to: 200, duration: 100 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    anim.updateCallback(150);
    expect(transform.offsetMax.x).toBe(150);
  });
});

describe('animateUiOffsetMaxY', () => {
  it('animates offsetMax.y', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const transform = makeTransform(world, entity);

    animateUiOffsetMaxY(world, entity, { from: 100, to: 50, duration: 100 });

    const anim = world.getComponent(entity, animationId)!.animations[0];

    anim.updateCallback(75);
    expect(transform.offsetMax.y).toBe(75);
  });
});
