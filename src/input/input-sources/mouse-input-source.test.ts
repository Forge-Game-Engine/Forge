import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MouseInputSource } from './mouse-input-source';
import { TriggerAction, InputAxis1d, Axis2dAction } from '../input-types';
import { Game } from '../../ecs';
import { axisMeasurements, mouseButtons } from '../constants';
import { buttonMoments } from '../constants/button-moments';

describe('MouseInputSource', () => {
  let mouseInputSource: MouseInputSource;
  let inputAction: TriggerAction;
  let inputAxis1d: InputAxis1d;
  let inputAxis2d: Axis2dAction;
  let game: Game;

  beforeEach(() => {
    global.window = window;
    inputAction = new TriggerAction('test-action');
    inputAxis1d = new InputAxis1d('test-axis-1d');
    inputAxis2d = new Axis2dAction('test-axis-2d');
    game = new Game();
    mouseInputSource = new MouseInputSource(game);
  });

  afterEach(() => {
    mouseInputSource.stop();
    vi.restoreAllMocks();
  });

  it('should bind and update the axis-2d on mouse move based on the coordinates', () => {
    mouseInputSource.bindAxis2d(inputAxis2d, {
      type: axisMeasurements.absolute,
    });

    const syntheticMove = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 200,
      clientY: 400,
    });

    game.container.dispatchEvent(syntheticMove);

    expect(inputAxis2d.value.x).toBe(200);
    expect(inputAxis2d.value.y).toBe(400);
  });

  it('should bind and update the axis-2d on mouse move based on the delta', () => {
    mouseInputSource.bindAxis2d(inputAxis2d, { type: axisMeasurements.delta });

    const syntheticMove1 = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 200,
      clientY: 400,
    });

    const syntheticMove2 = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 220,
      clientY: 410,
    });

    game.container.dispatchEvent(syntheticMove1);
    game.container.dispatchEvent(syntheticMove2);

    expect(inputAxis2d.value.x).toBe(20);
    expect(inputAxis2d.value.y).toBe(10);
  });

  it('should remove event listeners on stop', () => {
    const removeEventListenerSpy = vi.spyOn(
      game.container,
      'removeEventListener',
    );
    mouseInputSource.stop();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'mousedown',
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'mouseup',
      expect.any(Function),
    );
  });

  it('should add a new action binding if not already present', () => {
    mouseInputSource.bindAction(inputAction, {
      mouseButton: mouseButtons.left,
      moment: buttonMoments.down,
    });

    const mouseDownEvent = new MouseEvent('mousedown', {
      button: mouseButtons.left,
    });

    expect(inputAction.isTriggered).toBe(false);

    game.container.dispatchEvent(mouseDownEvent);
    expect(inputAction.isTriggered).toBe(true);
  });

  it('should update an existing action binding if already present', () => {
    const actionArgs = {
      mouseButton: mouseButtons.left,
      moment: buttonMoments.down,
    };

    const inputAction1 = new TriggerAction('test-action-1');
    const inputAction2 = new TriggerAction('test-action-2');

    mouseInputSource.bindAction(inputAction, actionArgs);
    mouseInputSource.bindAction(inputAction2, actionArgs);

    const mouseDownEvent = new MouseEvent('mousedown', {
      button: mouseButtons.left,
    });
    game.container.dispatchEvent(mouseDownEvent);

    expect(inputAction1.isTriggered).toBe(false);
    expect(inputAction2.isTriggered).toBe(true);
  });

  it('should not trigger the action if mouseButton or moment does not match', () => {
    const actionArgs = {
      mouseButton: mouseButtons.left,
      moment: buttonMoments.down,
    };
    mouseInputSource.bindAction(inputAction, actionArgs);

    // Dispatch event with different button
    const mouseDownEvent = new MouseEvent('mousedown', {
      button: mouseButtons.right,
    });
    game.container.dispatchEvent(mouseDownEvent);

    expect(inputAction.isTriggered).toBe(false);

    inputAction.reset();

    // Dispatch event with correct button but wrong moment
    const mouseUpEvent = new MouseEvent('mouseup', {
      button: mouseButtons.left,
    });
    game.container.dispatchEvent(mouseUpEvent);

    expect(inputAction.isTriggered).toBe(false);
  });

  it('should add a new axis-1d binding if not already present', () => {
    mouseInputSource.bindAxis1d(inputAxis1d);

    // Simulate a wheel event to trigger axis update
    const wheelEvent = new WheelEvent('wheel', { deltaY: 42 });
    game.container.dispatchEvent(wheelEvent);

    expect(inputAxis1d.value).toBe(42);
  });

  it('should not add the same axis-1d binding more than once', () => {
    mouseInputSource.bindAxis1d(inputAxis1d);
    mouseInputSource.bindAxis1d(inputAxis1d);

    // Simulate a wheel event
    const wheelEvent = new WheelEvent('wheel', { deltaY: 10 });
    game.container.dispatchEvent(wheelEvent);

    expect(inputAxis1d.value).toBe(10);

    // Reset and simulate another wheel event to ensure only one update occurs
    inputAxis1d.reset();
    game.container.dispatchEvent(new WheelEvent('wheel', { deltaY: 5 }));
    expect(inputAxis1d.value).toBe(5);
  });

  it('should not add the same axis-2d binding more than once', () => {
    mouseInputSource.bindAxis2d(inputAxis2d, {
      type: axisMeasurements.absolute,
    });

    mouseInputSource.bindAxis2d(inputAxis2d, {
      type: axisMeasurements.absolute,
    });

    const syntheticMove = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 200,
      clientY: 400,
    });
    game.container.dispatchEvent(syntheticMove);

    expect(inputAxis2d.value.x).toBe(200);
  });

  it('should add the same axis-2d binding more than once if the type is different', () => {
    mouseInputSource.bindAxis2d(inputAxis2d, {
      type: axisMeasurements.absolute,
    });

    mouseInputSource.bindAxis2d(inputAxis2d, {
      type: axisMeasurements.delta,
    });

    const syntheticMove1 = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 200,
      clientY: 400,
    });

    const syntheticMove2 = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 210,
      clientY: 400,
    });
    game.container.dispatchEvent(syntheticMove1);
    game.container.dispatchEvent(syntheticMove2);

    expect(inputAxis2d.value.x).toBe(10);
  });
});
