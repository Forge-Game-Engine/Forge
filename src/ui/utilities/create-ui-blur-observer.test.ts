import { afterEach, describe, expect, it, vi } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world';
import { ParameterizedForgeEvent } from '../../events/parameterized-forge-event';
import { Vector2 } from '../../math/index';
import { uiFocusId } from '../components/ui-focus-component';
import { uiPointerStateId } from '../components/ui-pointer-state-component';
import { createUiState, uiStateId } from '../components/ui-state-component';
import { UiCanvasResizeEventData } from './create-ui-resize-observer';
import {
  createUiBlurObserver,
  defaultUiBlurPolicy,
} from './create-ui-blur-observer';

function makeWorld(): {
  world: EcsWorld;
  canvas: number;
  hovered: number;
  pressed: number;
} {
  const world = new EcsWorld();
  const canvas = world.createEntity();
  const hovered = world.createEntity();
  const pressed = world.createEntity();

  world.addComponent(canvas, uiFocusId, { focused: null, focusRing: false });
  world.addComponent(canvas, uiPointerStateId, {
    hovered,
    pressed,
    pointer: new Vector2(100, 100),
  });

  const hoveredState = createUiState();

  hoveredState.hovered = true;
  world.addComponent(hovered, uiStateId, hoveredState);

  const pressedState = createUiState();

  pressedState.pressed = true;
  world.addComponent(pressed, uiStateId, pressedState);

  return { world, canvas, hovered, pressed };
}

function makeContainer(): HTMLElement {
  return document.createElement('div');
}

describe('createUiBlurObserver', () => {
  describe('defaultUiBlurPolicy', () => {
    it('has sensible defaults', () => {
      expect(defaultUiBlurPolicy.clearHoverOnContainerBlur).toBe(true);
      expect(defaultUiBlurPolicy.clearPressOnContainerBlur).toBe(true);
      expect(defaultUiBlurPolicy.clearFocusOnContainerBlur).toBe(false);
      expect(defaultUiBlurPolicy.clearHoverOnTabBlur).toBe(true);
      expect(defaultUiBlurPolicy.clearPressOnTabBlur).toBe(true);
      expect(defaultUiBlurPolicy.clearFocusOnTabBlur).toBe(false);
      expect(defaultUiBlurPolicy.clearHoverOnMouseLeave).toBe(true);
      expect(defaultUiBlurPolicy.clearPressOnMouseLeave).toBe(true);
      expect(defaultUiBlurPolicy.clearHoverOnResize).toBe(true);
      expect(defaultUiBlurPolicy.clearPressOnResize).toBe(true);
    });
  });

  describe('container blur', () => {
    it('clears hover and press on container blur event', () => {
      const { world, canvas, hovered, pressed } = makeWorld();
      const container = makeContainer();

      createUiBlurObserver(world, canvas, container);

      container.dispatchEvent(new Event('blur', { bubbles: true }));

      const ps = world.getComponent(canvas, uiPointerStateId)!;
      const hs = world.getComponent(hovered, uiStateId)!;
      const prs = world.getComponent(pressed, uiStateId)!;

      expect(ps.hovered).toBeNull();
      expect(ps.pressed).toBeNull();
      expect(hs.hovered).toBe(false);
      expect(prs.pressed).toBe(false);
    });

    it('raises onHoverExit on container blur', () => {
      const { world, canvas, hovered } = makeWorld();
      const container = makeContainer();
      const state = world.getComponent(hovered, uiStateId)!;
      const handler = vi.fn();

      state.onHoverExit.registerListener(handler);
      createUiBlurObserver(world, canvas, container);
      container.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not clear focus when clearFocusOnContainerBlur is false (default)', () => {
      const { world, canvas } = makeWorld();
      const container = makeContainer();
      const focusComp = world.getComponent(canvas, uiFocusId)!;

      focusComp.focused = 99;
      createUiBlurObserver(world, canvas, container);
      container.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(focusComp.focused).toBe(99);
    });

    it('clears focus when clearFocusOnContainerBlur is true', () => {
      const { world, canvas } = makeWorld();
      const container = makeContainer();
      const focusComp = world.getComponent(canvas, uiFocusId)!;

      focusComp.focused = 99;
      createUiBlurObserver(world, canvas, container, {
        policy: { clearFocusOnContainerBlur: true },
      });
      container.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(focusComp.focused).toBeNull();
    });
  });

  describe('mouseleave', () => {
    it('clears hover and press on mouseleave', () => {
      const { world, canvas } = makeWorld();
      const container = makeContainer();

      createUiBlurObserver(world, canvas, container);
      container.dispatchEvent(new Event('mouseleave'));

      const ps = world.getComponent(canvas, uiPointerStateId)!;

      expect(ps.hovered).toBeNull();
      expect(ps.pressed).toBeNull();
    });

    it('does not clear hover when clearHoverOnMouseLeave is false', () => {
      const { world, canvas } = makeWorld();
      const container = makeContainer();
      const ps = world.getComponent(canvas, uiPointerStateId)!;
      const originalHovered = ps.hovered;

      createUiBlurObserver(world, canvas, container, {
        policy: {
          clearHoverOnMouseLeave: false,
          clearPressOnMouseLeave: false,
        },
      });
      container.dispatchEvent(new Event('mouseleave'));

      expect(ps.hovered).toBe(originalHovered);
    });
  });

  describe('resize event', () => {
    it('clears hover and press on canvas resize', () => {
      const { world, canvas } = makeWorld();
      const container = makeContainer();
      const onResize = new ParameterizedForgeEvent<UiCanvasResizeEventData>(
        'test',
      );

      createUiBlurObserver(world, canvas, container, { onResize });
      onResize.raise({ width: 1024, height: 768 });

      const ps = world.getComponent(canvas, uiPointerStateId)!;

      expect(ps.hovered).toBeNull();
      expect(ps.pressed).toBeNull();
    });
  });

  describe('stop / teardown', () => {
    it('removes listeners on stop so events no longer fire', () => {
      const { world, canvas } = makeWorld();
      const container = makeContainer();
      const observer = createUiBlurObserver(world, canvas, container);

      observer.stop();

      const ps = world.getComponent(canvas, uiPointerStateId)!;
      const originalHovered = ps.hovered;

      container.dispatchEvent(new Event('mouseleave'));

      // State should be unchanged after stop.
      expect(ps.hovered).toBe(originalHovered);
    });

    it('deregisters from onResize on stop', () => {
      const { world, canvas } = makeWorld();
      const container = makeContainer();
      const onResize = new ParameterizedForgeEvent<UiCanvasResizeEventData>(
        'test',
      );
      const observer = createUiBlurObserver(world, canvas, container, {
        onResize,
      });

      observer.stop();

      const ps = world.getComponent(canvas, uiPointerStateId)!;
      const originalHovered = ps.hovered;

      onResize.raise({ width: 1024, height: 768 });

      expect(ps.hovered).toBe(originalHovered);
    });
  });

  describe('window blur', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('clears hover and press on window blur', () => {
      const { world, canvas } = makeWorld();
      const container = makeContainer();

      createUiBlurObserver(world, canvas, container);

      // Simulate window blur
      globalThis.dispatchEvent(new Event('blur'));

      const ps = world.getComponent(canvas, uiPointerStateId)!;

      expect(ps.hovered).toBeNull();
      expect(ps.pressed).toBeNull();
    });
  });
});
