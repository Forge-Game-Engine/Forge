import { describe, expect, it } from 'vitest';
import { animationId } from '../../animations/components/animation-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import { Color } from '../../rendering/color.js';
import type { Renderable } from '../../rendering/renderable.js';
import type { UiInstanceComponents } from '../components/ui-instance-components.js';
import { uiRenderableId } from '../components/ui-renderable-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import type { UiInteractionEvent } from '../types/index.js';
import type { UiStateEcsComponent } from '../components/ui-state-component.js';
import {
  computeUiTargetStyle,
  createUiStateTransition,
  UiTransitionSpec,
} from './create-ui-state-transition.js';
import type { UiStyleOverride } from './apply-ui-state-style.js';

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

function makeEvent() {
  return new ParameterizedForgeEvent<UiInteractionEvent>('test');
}

function makeState(
  overrides: Partial<UiStateEcsComponent> = {},
): UiStateEcsComponent {
  return {
    hovered: false,
    pressed: false,
    focused: false,
    disabled: false,
    onHoverEnter: makeEvent(),
    onHoverExit: makeEvent(),
    onPressStart: makeEvent(),
    onPressEnd: makeEvent(),
    onClick: makeEvent(),
    onFocus: makeEvent(),
    onBlur: makeEvent(),
    onDisabledChange: makeEvent(),
    ...overrides,
  };
}

// ── computeUiTargetStyle ──────────────────────────────────────────────────────

describe('computeUiTargetStyle', () => {
  const base: UiStyleOverride = { opacity: 1, tintColor: Color.white };

  it('returns base when no state flags are active', () => {
    const state = makeState();
    const result = computeUiTargetStyle(state, base, {});

    expect(result.opacity).toBe(1);
    expect(result.tintColor).toBe(Color.white);
  });

  it('layers hover overrides', () => {
    const state = makeState({ hovered: true });
    const hoverColor = new Color(0.9, 0.9, 0.9);
    const result = computeUiTargetStyle(state, base, {
      hover: { tintColor: hoverColor },
    });

    expect(result.tintColor).toBe(hoverColor);
    expect(result.opacity).toBe(1); // base unchanged
  });

  it('layers pressed overrides on top of hover', () => {
    const state = makeState({ hovered: true, pressed: true });
    const pressColor = new Color(0.75, 0.75, 0.75);
    const result = computeUiTargetStyle(state, base, {
      hover: { tintColor: new Color(0.9, 0.9, 0.9) },
      pressed: { tintColor: pressColor },
    });

    expect(result.tintColor).toBe(pressColor);
  });

  it('layers disabled overrides last', () => {
    const state = makeState({ hovered: true, disabled: true });
    const disabledColor = new Color(0.7, 0.7, 0.7);
    const result = computeUiTargetStyle(state, base, {
      hover: { tintColor: new Color(0.9, 0.9, 0.9) },
      disabled: { tintColor: disabledColor, opacity: 0.6 },
    });

    expect(result.tintColor).toBe(disabledColor);
    expect(result.opacity).toBe(0.6);
  });
});

// ── createUiStateTransition ───────────────────────────────────────────────────

describe('createUiStateTransition', () => {
  it('starts opacity animation when onHoverEnter fires and config has hover.opacity', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = makeRenderable(world, entity);
    makeTransform(world, entity);

    const state = makeState();
    const base: UiStyleOverride = { opacity: 1 };
    const transition: UiTransitionSpec = { duration: 100 };

    createUiStateTransition(
      world,
      entity,
      renderable,
      state,
      base,
      {
        hover: { opacity: 0.8 },
      },
      transition,
    );

    state.hovered = true;
    state.onHoverEnter.raise({} as UiInteractionEvent);

    const animComp = world.getComponent(entity, animationId);

    expect(animComp).not.toBeNull();
    const opacityAnim = animComp!.animations.find(
      (a) => a.tag === 'ui.opacity',
    );
    expect(opacityAnim).toBeDefined();
    expect(opacityAnim!.endValue).toBe(0.8);
  });

  it('cancels previous opacity animation when state changes rapidly', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = makeRenderable(world, entity);
    makeTransform(world, entity);

    const state = makeState();
    const base: UiStyleOverride = { opacity: 1 };

    createUiStateTransition(world, entity, renderable, state, base, {
      hover: { opacity: 0.8 },
    });

    // Hover in
    state.hovered = true;
    state.onHoverEnter.raise({} as UiInteractionEvent);

    // Hover out before animation completes
    state.hovered = false;
    state.onHoverExit.raise({} as UiInteractionEvent);

    const animComp = world.getComponent(entity, animationId);
    const opacityAnims = animComp!.animations.filter(
      (a) => a.tag === 'ui.opacity',
    );

    // Only the most recent animation should remain
    expect(opacityAnims).toHaveLength(1);
    expect(opacityAnims[0].endValue).toBe(1); // animating back to base opacity
  });

  it('starts borderWidth animation for focus state with focused config', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = makeRenderable(world, entity);
    makeTransform(world, entity);

    const state = makeState();
    const base: UiStyleOverride = { borderWidth: 0 };

    createUiStateTransition(world, entity, renderable, state, base, {
      focused: { borderWidth: 2 },
    });

    state.focused = true;
    state.onFocus.raise({} as UiInteractionEvent);

    const anims = world.getComponent(entity, animationId)!.animations;
    const bwAnim = anims.find((a) => a.tag === 'ui.borderWidth');

    expect(bwAnim).toBeDefined();
    expect(bwAnim!.endValue).toBe(2);
  });

  it('returns cleanup function that deregisters all listeners', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = makeRenderable(world, entity);
    makeTransform(world, entity);

    const state = makeState();
    const base: UiStyleOverride = { opacity: 1 };

    const cleanup = createUiStateTransition(
      world,
      entity,
      renderable,
      state,
      base,
      {
        hover: { opacity: 0.8 },
      },
    );

    cleanup();

    // After cleanup, events should not trigger animations
    state.hovered = true;
    state.onHoverEnter.raise({} as UiInteractionEvent);

    expect(world.getComponent(entity, animationId)).toBeNull();
  });

  it('starts tintColor animation when hover config has tintColor', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = makeRenderable(world, entity);
    makeTransform(world, entity);

    const state = makeState();
    const base: UiStyleOverride = { tintColor: Color.white };
    const hoverColor = new Color(0.9, 0.9, 0.9);

    createUiStateTransition(world, entity, renderable, state, base, {
      hover: { tintColor: hoverColor },
    });

    state.hovered = true;
    state.onHoverEnter.raise({} as UiInteractionEvent);

    const tintAnim = world
      .getComponent(entity, animationId)!
      .animations.find((a) => a.tag === 'ui.tintColor');

    expect(tintAnim).toBeDefined();
  });
});
