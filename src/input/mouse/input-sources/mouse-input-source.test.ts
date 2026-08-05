import { beforeEach, describe, expect, it } from 'vitest';
import { MouseInputSource } from './mouse-input-source';
import { buttonMoments, cursorValueTypes, mouseButtons } from '../../constants';
import { InputManager } from '../../input-manager';
import {
  Axis1dAction,
  Axis2dAction,
  HoldAction,
  TriggerAction,
} from '../../actions';
import {
  MouseAxis1dBinding,
  MouseAxis2dBinding,
  MouseHoldBinding,
  MouseTriggerBinding,
} from '../bindings';

describe('MouseInputSource', () => {
  const group = 'default';

  let container: HTMLDivElement;
  let inputManager: InputManager;
  let source: MouseInputSource;
  let clickDownAction: TriggerAction;
  let clickUpAction: TriggerAction;
  let holdAction: HoldAction;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    container.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 50,
        width: 200,
        height: 100,
      }) as DOMRect;

    inputManager = new InputManager();
    inputManager.setActiveGroup(group);
    source = new MouseInputSource(inputManager, container);

    clickDownAction = new TriggerAction('clickDownAction', group);
    clickUpAction = new TriggerAction('clickUpAction', group);
    holdAction = new HoldAction('holdAction', group);

    inputManager.addResettable(clickDownAction);
    inputManager.addResettable(clickUpAction);

    source.triggerBindings.add(
      new MouseTriggerBinding(
        clickDownAction,
        mouseButtons.left,
        buttonMoments.down,
      ),
    );

    source.triggerBindings.add(
      new MouseTriggerBinding(
        clickUpAction,
        mouseButtons.left,
        buttonMoments.up,
      ),
    );

    source.holdBindings.add(
      new MouseHoldBinding(holdAction, mouseButtons.right),
    );
  });

  it('dispatches mouse down trigger actions', () => {
    expect(clickDownAction.isTriggered).toBe(false);

    container.dispatchEvent(
      new MouseEvent('mousedown', { button: mouseButtons.left }),
    );
    expect(clickDownAction.isTriggered).toBe(true);

    inputManager.reset();
    expect(clickDownAction.isTriggered).toBe(false);
  });

  it('dispatches mouse up trigger actions', () => {
    expect(clickUpAction.isTriggered).toBe(false);

    container.dispatchEvent(
      new MouseEvent('mouseup', { button: mouseButtons.left }),
    );
    expect(clickUpAction.isTriggered).toBe(true);

    inputManager.reset();
    expect(clickUpAction.isTriggered).toBe(false);
  });

  it('does not dispatch mouse down triggers for a group other than the active group', () => {
    const menuAction = new TriggerAction('menuAction', 'menu');

    inputManager.addResettable(menuAction);
    source.triggerBindings.add(
      new MouseTriggerBinding(
        menuAction,
        mouseButtons.left,
        buttonMoments.down,
      ),
    );

    container.dispatchEvent(
      new MouseEvent('mousedown', { button: mouseButtons.left }),
    );

    expect(clickDownAction.isTriggered).toBe(true);
    expect(menuAction.isTriggered).toBe(false);
  });

  it('dispatches mouse hold actions', () => {
    expect(holdAction.isHeld).toBe(false);

    container.dispatchEvent(
      new MouseEvent('mousedown', { button: mouseButtons.right }),
    );
    expect(holdAction.isHeld).toBe(true);

    container.dispatchEvent(
      new MouseEvent('mouseup', { button: mouseButtons.right }),
    );
    expect(holdAction.isHeld).toBe(false);
  });

  it('does not dispatch mouse hold start actions for a group other than the active group', () => {
    const menuHoldAction = new HoldAction('menuHoldAction', 'menu');

    source.holdBindings.add(
      new MouseHoldBinding(menuHoldAction, mouseButtons.right),
    );

    container.dispatchEvent(
      new MouseEvent('mousedown', { button: mouseButtons.right }),
    );

    expect(holdAction.isHeld).toBe(true);
    expect(menuHoldAction.isHeld).toBe(false);
  });

  it('dispatches wheel events to axis1d bindings', () => {
    const scrollAction = new Axis1dAction('scrollAction', group);

    source.axis1dBindings.add(new MouseAxis1dBinding(scrollAction));

    container.dispatchEvent(new WheelEvent('wheel', { deltaY: 50 }));

    expect(scrollAction.value).toBe(0.5);
  });

  it('dispatches mouse move events to axis2d bindings using ratio values by default', () => {
    const moveAction = new Axis2dAction('moveAction', group);

    source.axis2dBindings.add(new MouseAxis2dBinding(moveAction));

    // container is at (100, 50) and is 200x100, so clientX/Y of
    // (200, 100) is 50% across and 50% down -> centered at the default
    // (0.5, 0.5) origin.
    container.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 200, clientY: 100 }),
    );

    expect(moveAction.value.x).toBeCloseTo(0);
    expect(moveAction.value.y).toBeCloseTo(0);

    container.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 300, clientY: 150 }),
    );

    expect(moveAction.value.x).toBeCloseTo(0.5);
    expect(moveAction.value.y).toBeCloseTo(0.5);
  });

  it('dispatches mouse move events to axis2d bindings using absolute values', () => {
    const moveAction = new Axis2dAction('moveAction', group);

    source.axis2dBindings.add(
      new MouseAxis2dBinding(moveAction, {
        cursorValueType: cursorValueTypes.absolute,
      }),
    );

    container.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 200, clientY: 100 }),
    );

    // (200 - 100) - 0.5 * 200 = 0, (100 - 50) - 0.5 * 100 = 0
    expect(moveAction.value.x).toBeCloseTo(0);
    expect(moveAction.value.y).toBeCloseTo(0);

    container.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 250, clientY: 100 }),
    );

    expect(moveAction.value.x).toBeCloseTo(50);
    expect(moveAction.value.y).toBeCloseTo(0);
  });

  it('throws when a binding has an unsupported cursor value type', () => {
    const moveAction = new Axis2dAction('moveAction', group);
    const binding = new MouseAxis2dBinding(moveAction);

    // @ts-expect-error deliberately assigning an invalid cursor value type
    binding.cursorValueType = 'unsupported';

    source.axis2dBindings.add(binding);

    // The DOM spec doesn't propagate exceptions thrown inside event
    // listeners back to `dispatchEvent`'s caller, so the private handler is
    // invoked directly here to observe the throw.
    const onMouseMoveHandler = (
      source as unknown as Record<string, (event: MouseEvent) => void>
    )['_onMouseMoveHandler'];

    expect(() =>
      onMouseMoveHandler(
        new MouseEvent('mousemove', { clientX: 200, clientY: 100 }),
      ),
    ).toThrow('Unsupported cursor value type: unsupported');
  });

  it('clears button state on reset', () => {
    container.dispatchEvent(
      new MouseEvent('mousedown', { button: mouseButtons.left }),
    );
    expect(clickDownAction.isTriggered).toBe(true);

    source.reset();

    inputManager.reset();
    expect(clickDownAction.isTriggered).toBe(false);
  });

  it('stops dispatching after stop is called', () => {
    source.stop();

    container.dispatchEvent(
      new MouseEvent('mousedown', { button: mouseButtons.left }),
    );

    expect(clickDownAction.isTriggered).toBe(false);
  });
});
