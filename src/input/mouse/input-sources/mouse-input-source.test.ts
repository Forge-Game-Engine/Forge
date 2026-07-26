import { beforeEach, describe, expect, it } from 'vitest';
import { MouseInputSource } from './mouse-input-source';
import { buttonMoments, mouseButtons } from '../../constants';
import { InputManager } from '../../input-manager';
import { HoldAction, TriggerAction } from '../../actions';
import { MouseHoldBinding, MouseTriggerBinding } from '../bindings';

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
});
