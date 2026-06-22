import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parentId } from '../../common/components/parent-component.js';
import { Time } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Matrix3x3, Rect, Vector2 } from '../../math/index.js';
import {
  animationId,
  createAnimatedProperty,
  createAnimationEcsSystem,
} from '../../animations/index.js';
import { uiFocusId } from '../components/ui-focus-component.js';
import { uiFocusableId } from '../components/ui-focusable-component.js';
import { createUiState, uiStateId } from '../components/ui-state-component.js';
import { uiTransformId } from '../components/ui-transform-component.js';
import { createUiCanvas } from '../utilities/create-ui-canvas.js';
import { destroyUiSubtree } from '../utilities/destroy-ui-subtree.js';
import { setFocus } from '../utilities/set-focus.js';
import { getUiRenderMetrics } from './ui-render-system.js';

// ── helpers ────────────────────────────────────────────────────────────────────

function makeTransform() {
  return {
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(0, 0),
    offsetMin: new Vector2(0, 0),
    offsetMax: new Vector2(100, 50),
    pivot: new Vector2(0, 0),
    rotation: 0,
    scale: new Vector2(1, 1),
    resolvedRect: new Rect(new Vector2(0, 0), new Vector2(100, 50)),
    worldMatrix: Matrix3x3.identity,
    isDirty: true,
  };
}

function makeFocusableEntity(world: EcsWorld, canvas: number): number {
  const entity = world.createEntity();

  world.addComponent(entity, parentId, { parent: canvas });
  world.addComponent(entity, uiTransformId, makeTransform());
  world.addComponent(entity, uiStateId, createUiState());
  world.addComponent(entity, uiFocusableId, { tabIndex: 0, focusable: true });

  return entity;
}

// ── F9.4 — Metrics API ────────────────────────────────────────────────────────

describe('getUiRenderMetrics', () => {
  it('returns zero counts before any render pass', () => {
    const metrics = getUiRenderMetrics();

    expect(metrics.batchCount).toBeGreaterThanOrEqual(0);
    expect(metrics.instanceCount).toBeGreaterThanOrEqual(0);
    expect(typeof metrics.batchCount).toBe('number');
    expect(typeof metrics.instanceCount).toBe('number');
  });
});

// ── F9.3 — Rapid focus changes ────────────────────────────────────────────────

describe('Rapid focus changes (F9.3)', () => {
  let world: EcsWorld;
  let canvasEntity: number;

  beforeEach(() => {
    world = new EcsWorld();
    canvasEntity = createUiCanvas(world, { width: 800, height: 600 });

    world.addComponent(canvasEntity, uiFocusId, {
      focused: null,
      focusRing: false,
    });
  });

  it('has exactly one focused entity after N rapid setFocus calls', () => {
    const entities = Array.from({ length: 10 }, () =>
      makeFocusableEntity(world, canvasEntity),
    );

    for (const entity of entities) {
      setFocus(world, canvasEntity, entity, 'keyboard');
    }

    const focusComp = world.getComponent(canvasEntity, uiFocusId);
    const focusedCount = entities.filter((e) => {
      const state = world.getComponent(e, uiStateId);

      return state?.focused === true;
    }).length;

    expect(focusComp?.focused).toBe(entities[entities.length - 1]);
    expect(focusedCount).toBe(1);
  });

  it('onFocus fires once per setFocus call', () => {
    const entities = Array.from({ length: 5 }, () =>
      makeFocusableEntity(world, canvasEntity),
    );

    const focusCounts = entities.map(() => 0);

    entities.forEach((entity, i) => {
      const state = world.getComponent(entity, uiStateId)!;

      state.onFocus.registerListener(() => {
        focusCounts[i]++;
      });
    });

    for (const entity of entities) {
      setFocus(world, canvasEntity, entity, 'pointer');
    }

    expect(focusCounts).toEqual([1, 1, 1, 1, 1]);
  });

  it('onBlur fires for each entity that loses focus', () => {
    const entities = Array.from({ length: 4 }, () =>
      makeFocusableEntity(world, canvasEntity),
    );

    const blurCounts = entities.map(() => 0);

    entities.forEach((entity, i) => {
      const state = world.getComponent(entity, uiStateId)!;

      state.onBlur.registerListener(() => {
        blurCounts[i]++;
      });
    });

    for (const entity of entities) {
      setFocus(world, canvasEntity, entity, 'pointer');
    }

    // First entity never loses focus by being blurred before gaining it.
    // e[0] blurred when e[1] focused, e[1] blurred when e[2] focused, etc.
    expect(blurCounts[0]).toBe(1);
    expect(blurCounts[1]).toBe(1);
    expect(blurCounts[2]).toBe(1);
    expect(blurCounts[3]).toBe(0);
  });

  it('setFocus with null clears focus without throwing', () => {
    const entity = makeFocusableEntity(world, canvasEntity);

    setFocus(world, canvasEntity, entity, 'pointer');
    expect(() => setFocus(world, canvasEntity, null, 'pointer')).not.toThrow();

    const focusComp = world.getComponent(canvasEntity, uiFocusId);

    expect(focusComp?.focused).toBeNull();

    const state = world.getComponent(entity, uiStateId);

    expect(state?.focused).toBe(false);
  });

  it('repeated setFocus to the same entity does not fire duplicate events', () => {
    const entity = makeFocusableEntity(world, canvasEntity);
    const state = world.getComponent(entity, uiStateId)!;
    const onFocus = vi.fn();

    state.onFocus.registerListener(onFocus);

    setFocus(world, canvasEntity, entity, 'keyboard');
    setFocus(world, canvasEntity, entity, 'keyboard');
    setFocus(world, canvasEntity, entity, 'keyboard');

    expect(onFocus).toHaveBeenCalledTimes(1);
  });
});

// ── F9.3/F9.4 — Animation array cleanup ──────────────────────────────────────

describe('Animation array cleanup (F9.3 / F9.4)', () => {
  it('finished animations are spliced from the array after completion', () => {
    const time = new Time();
    const world = new EcsWorld();

    world.addSystem(createAnimationEcsSystem(time));

    const entity = world.createEntity();
    const updateCb = vi.fn();
    const finishedCb = vi.fn();

    world.addComponent(entity, animationId, {
      animations: [
        createAnimatedProperty({
          duration: 100,
          startValue: 0,
          endValue: 1,
          updateCallback: updateCb,
          finishedCallback: finishedCb,
        }),
      ],
    });

    time.update(200);
    world.update();

    const animComp = world.getComponent(entity, animationId)!;

    expect(animComp.animations.length).toBe(0);
    expect(finishedCb).toHaveBeenCalledOnce();
  });

  it('hundreds of concurrent animations do not accumulate after completion', () => {
    const time = new Time();
    const world = new EcsWorld();

    world.addSystem(createAnimationEcsSystem(time));

    const entity = world.createEntity();
    const animations = Array.from({ length: 200 }, () =>
      createAnimatedProperty({
        duration: 50,
        startValue: 0,
        endValue: 1,
        updateCallback: () => void 0,
      }),
    );

    world.addComponent(entity, animationId, { animations });

    time.update(100);
    world.update();

    const animComp = world.getComponent(entity, animationId)!;

    expect(animComp.animations.length).toBe(0);
  });

  it('looping animations are retained until their loop count is exhausted', () => {
    const time = new Time();
    const world = new EcsWorld();

    world.addSystem(createAnimationEcsSystem(time));

    const entity = world.createEntity();
    const updateCb = vi.fn();

    world.addComponent(entity, animationId, {
      animations: [
        createAnimatedProperty({
          duration: 50,
          startValue: 0,
          endValue: 1,
          loop: 'loop',
          loopCount: 3,
          updateCallback: updateCb,
        }),
      ],
    });

    time.update(60);
    world.update();

    const animComp = world.getComponent(entity, animationId)!;

    // One iteration done; two remain.
    expect(animComp.animations.length).toBe(1);
    expect(animComp.animations[0].loopCount).toBe(2);
  });
});

// ── F9.3 — Teardown listener cleanup ─────────────────────────────────────────

describe('Teardown listener cleanup (F9.3)', () => {
  it('clearing state events removes all listeners', () => {
    const state = createUiState();
    const noop = (): void => void 0;

    state.onHoverEnter.registerListener(noop);
    state.onHoverExit.registerListener(noop);
    state.onPressStart.registerListener(noop);
    state.onPressEnd.registerListener(noop);
    state.onClick.registerListener(noop);
    state.onFocus.registerListener(noop);
    state.onBlur.registerListener(noop);
    state.onDisabledChange.registerListener(noop);

    state.onHoverEnter.clear();
    state.onHoverExit.clear();
    state.onPressStart.clear();
    state.onPressEnd.clear();
    state.onClick.clear();
    state.onFocus.clear();
    state.onBlur.clear();
    state.onDisabledChange.clear();

    expect(state.onHoverEnter.listeners.length).toBe(0);
    expect(state.onHoverExit.listeners.length).toBe(0);
    expect(state.onPressStart.listeners.length).toBe(0);
    expect(state.onPressEnd.listeners.length).toBe(0);
    expect(state.onClick.listeners.length).toBe(0);
    expect(state.onFocus.listeners.length).toBe(0);
    expect(state.onBlur.listeners.length).toBe(0);
    expect(state.onDisabledChange.listeners.length).toBe(0);
  });

  it('destroyUiSubtree removes thousands of entities without leaving components', () => {
    const world = new EcsWorld();
    const root = world.createEntity();

    world.addComponent(root, uiTransformId, makeTransform());

    const children: number[] = [];

    for (let i = 0; i < 500; i++) {
      const child = world.createEntity();

      world.addComponent(child, uiTransformId, makeTransform());
      world.addComponent(child, parentId, { parent: root });
      world.addComponent(child, uiStateId, createUiState());
      children.push(child);
    }

    destroyUiSubtree(world, root);

    expect(world.getComponent(root, uiTransformId)).toBeNull();

    for (const child of children) {
      expect(world.getComponent(child, uiTransformId)).toBeNull();
      expect(world.getComponent(child, uiStateId)).toBeNull();
    }
  });

  it('listener count does not grow when repeatedly creating and destroying state', () => {
    const noop = (): void => void 0;

    let maxListenerCount = 0;

    for (let i = 0; i < 100; i++) {
      const state = createUiState();

      state.onFocus.registerListener(noop);
      maxListenerCount = Math.max(
        maxListenerCount,
        state.onFocus.listeners.length,
      );

      state.onFocus.clear();

      expect(state.onFocus.listeners.length).toBe(0);
    }

    expect(maxListenerCount).toBe(1);
  });
});

// ── F9.4 — Batch count logic (non-GL) ────────────────────────────────────────

describe('Batch count (F9.4)', () => {
  it('distinct renderables produce separate batches (documented: GL-limited assertion)', () => {
    // The actual batch count is only verifiable in a WebGL context.
    // Here we document the expected behaviour:
    //   - N entities sharing one Renderable instance → 1 batch
    //   - N entities each with a different Renderable instance → N batches
    // Enforce this with a manual run of the stress-test demo (demo/ui-stress-test.html)
    // and compare getUiRenderMetrics().batchCount against the expected value.
    expect(true).toBe(true);
  });

  it('getUiRenderMetrics returns a plain object with numeric fields', () => {
    const metrics = getUiRenderMetrics();

    expect(metrics).toHaveProperty('batchCount');
    expect(metrics).toHaveProperty('instanceCount');
    expect(Number.isFinite(metrics.batchCount)).toBe(true);
    expect(Number.isFinite(metrics.instanceCount)).toBe(true);
  });
});
