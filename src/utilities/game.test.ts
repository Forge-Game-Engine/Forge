import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Time } from '../common/index.js';
import { EcsWorld } from '../ecs/ecs-world.js';
import { Game } from './game.js';

describe('Game', () => {
  let time: Time;
  let world: EcsWorld;
  let container: HTMLElement;
  let game: Game;
  let rafCallback: FrameRequestCallback | null;

  beforeEach(() => {
    time = new Time();
    world = new EcsWorld();
    container = document.createElement('div');
    game = new Game(time, world, container);

    rafCallback = null;

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallback = callback;

      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  it('updates time with its own performance.now() reading rather than the requestAnimationFrame timestamp argument', () => {
    const updateSpy = vi.spyOn(time, 'update');

    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2000);

    game.run();

    expect(updateSpy).toHaveBeenCalledWith(1000);
    expect(rafCallback).not.toBeNull();

    // requestAnimationFrame's own timestamp argument isn't guaranteed to be
    // monotonic relative to a prior performance.now() reading. Invoking the
    // scheduled frame with an arbitrary value here proves the loop ignores
    // it in favor of reading performance.now() itself.
    rafCallback?.(999_999);

    expect(updateSpy).toHaveBeenCalledWith(2000);
    expect(updateSpy).not.toHaveBeenCalledWith(999_999);
  });
});
