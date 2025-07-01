import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MouseInputSource } from './mouse-input-source';
import { InputAction } from '../input-types';

describe('MouseInputSource', () => {
  let mouseInputSource: MouseInputSource;
  let triggerSpy: ReturnType<typeof vi.fn>;
  let inputAction: InputAction;

  beforeEach(() => {
    global.window = window;
    triggerSpy = vi.fn();
    inputAction = { trigger: triggerSpy } as unknown as InputAction;
    mouseInputSource = new MouseInputSource();
  });

  afterEach(() => {
    mouseInputSource.stop();
    vi.restoreAllMocks();
  });

  it('should bind and trigger action on mousedown', () => {
    mouseInputSource.bindAction(inputAction, {
      mouseButton: 0,
      moment: 'down',
    });

    const event = new MouseEvent('mousedown', { button: 0 });
    window.dispatchEvent(event);

    expect(triggerSpy).toHaveBeenCalledTimes(1);
  });

  it('should bind and trigger action on mouseup', () => {
    mouseInputSource.bindAction(inputAction, {
      mouseButton: 2,
      moment: 'up',
    });

    const event = new MouseEvent('mouseup', { button: 2 });
    window.dispatchEvent(event);

    expect(triggerSpy).toHaveBeenCalledTimes(1);
  });

  it('should not trigger action if mouseButton does not match', () => {
    mouseInputSource.bindAction(inputAction, {
      mouseButton: 1,
      moment: 'down',
    });

    const event = new MouseEvent('mousedown', { button: 0 });
    window.dispatchEvent(event);

    expect(triggerSpy).not.toHaveBeenCalled();
  });

  it('should update existing action if binding to same mouseButton and moment', () => {
    const firstSpy = vi.fn();
    const secondSpy = vi.fn();
    const firstAction = { trigger: firstSpy } as unknown as InputAction;
    const secondAction = { trigger: secondSpy } as unknown as InputAction;

    mouseInputSource.bindAction(firstAction, {
      mouseButton: 0,
      moment: 'down',
    });
    mouseInputSource.bindAction(secondAction, {
      mouseButton: 0,
      moment: 'down',
    });

    const event = new MouseEvent('mousedown', { button: 0 });
    window.dispatchEvent(event);

    expect(firstSpy).not.toHaveBeenCalled();
    expect(secondSpy).toHaveBeenCalledTimes(1);
  });

  it('should remove event listeners on stop', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
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
});
