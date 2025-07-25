import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MouseInputSource } from './mouse-input-source';
import { Game } from '../../ecs';
import { InputManager } from '../input-manager';
import { Vector2 } from '../../math';

describe('MouseInputSource', () => {
  let inputManager: InputManager;
  let mouseInputSource: MouseInputSource;
  let game: Game;

  beforeEach(() => {
    global.window = window;

    inputManager = {
      dispatchAxis1dAction: vi.fn(),
      dispatchAxis2dAction: vi.fn(),
    } as unknown as InputManager;

    game = new Game();
    mouseInputSource = new MouseInputSource(inputManager, game);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should bind and update the axis-2d on mouse move based on the coordinates', () => {
    const event = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 200,
      clientY: 400,
    });

    game.container.dispatchEvent(event);

    expect(inputManager.dispatchAxis2dAction).toHaveBeenCalledWith(
      expect.objectContaining({
        source: mouseInputSource,
      }),
      new Vector2(200, 400),
    );
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
});
