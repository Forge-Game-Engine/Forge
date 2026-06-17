import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world';
import { Vector2 } from '../../math/index';
import { uiFocusId } from '../components/ui-focus-component';
import { uiFocusableId } from '../components/ui-focusable-component';
import { uiPointerStateId } from '../components/ui-pointer-state-component';
import { createUiState, uiStateId } from '../components/ui-state-component';
import { setFocus } from './set-focus';

function makeCanvas(world: EcsWorld): number {
  const entity = world.createEntity();

  world.addComponent(entity, uiFocusId, { focused: null, focusRing: false });
  world.addComponent(entity, uiPointerStateId, {
    hovered: null,
    pressed: null,
    pointer: Vector2.zero,
  });

  return entity;
}

function makeElement(world: EcsWorld, focusable = true): number {
  const entity = world.createEntity();

  world.addComponent(entity, uiStateId, createUiState());
  world.addComponent(entity, uiFocusableId, {
    tabIndex: 0,
    focusable,
  });

  return entity;
}

describe('setFocus', () => {
  let world: EcsWorld;
  let canvas: number;

  beforeEach(() => {
    world = new EcsWorld();
    canvas = makeCanvas(world);
  });

  it('does nothing when the canvas has no UiFocusEcsComponent', () => {
    const other = world.createEntity();
    const elem = makeElement(world);

    expect(() => setFocus(world, other, elem, 'pointer')).not.toThrow();
  });

  it('sets focused to the target entity', () => {
    const elem = makeElement(world);

    setFocus(world, canvas, elem, 'pointer');

    const focus = world.getComponent(canvas, uiFocusId);

    expect(focus?.focused).toBe(elem);
  });

  it('sets focused flag on the new element', () => {
    const elem = makeElement(world);

    setFocus(world, canvas, elem, 'pointer');

    const state = world.getComponent(elem, uiStateId);

    expect(state?.focused).toBe(true);
  });

  it('raises onFocus on the newly focused entity', () => {
    const elem = makeElement(world);
    const state = world.getComponent(elem, uiStateId)!;
    const handler = vi.fn();

    state.onFocus.registerListener(handler);
    setFocus(world, canvas, elem, 'pointer');

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0]).toMatchObject({
      entity: elem,
      source: 'pointer',
    });
  });

  it('raises onBlur on the previously focused entity', () => {
    const elem1 = makeElement(world);
    const elem2 = makeElement(world);
    const state1 = world.getComponent(elem1, uiStateId)!;
    const handler = vi.fn();

    setFocus(world, canvas, elem1, 'pointer');
    state1.onBlur.registerListener(handler);
    setFocus(world, canvas, elem2, 'pointer');

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0]).toMatchObject({ entity: elem1 });
  });

  it('clears focused flag on the previously focused entity', () => {
    const elem1 = makeElement(world);
    const elem2 = makeElement(world);

    setFocus(world, canvas, elem1, 'pointer');
    setFocus(world, canvas, elem2, 'pointer');

    const state1 = world.getComponent(elem1, uiStateId);

    expect(state1?.focused).toBe(false);
  });

  it('sets focusRing to false for pointer source', () => {
    const elem = makeElement(world);

    setFocus(world, canvas, elem, 'pointer');

    const focus = world.getComponent(canvas, uiFocusId);

    expect(focus?.focusRing).toBe(false);
  });

  it('sets focusRing to true for keyboard source', () => {
    const elem = makeElement(world);

    setFocus(world, canvas, elem, 'keyboard');

    const focus = world.getComponent(canvas, uiFocusId);

    expect(focus?.focusRing).toBe(true);
  });

  it('clears focus when targetEntity is null', () => {
    const elem = makeElement(world);

    setFocus(world, canvas, elem, 'pointer');
    setFocus(world, canvas, null, 'pointer');

    const focus = world.getComponent(canvas, uiFocusId);

    expect(focus?.focused).toBeNull();
  });

  it('does nothing when re-focusing the same entity', () => {
    const elem = makeElement(world);
    const state = world.getComponent(elem, uiStateId)!;
    const blurHandler = vi.fn();
    const focusHandler = vi.fn();

    setFocus(world, canvas, elem, 'pointer');
    state.onBlur.registerListener(blurHandler);
    state.onFocus.registerListener(focusHandler);

    setFocus(world, canvas, elem, 'pointer');

    expect(blurHandler).not.toHaveBeenCalled();
    expect(focusHandler).not.toHaveBeenCalled();
  });

  it('refuses to focus a non-focusable entity and clears focus', () => {
    const elem = makeElement(world, false /* focusable = false */);

    setFocus(world, canvas, elem, 'keyboard');

    const focus = world.getComponent(canvas, uiFocusId);

    expect(focus?.focused).toBeNull();
  });
});
