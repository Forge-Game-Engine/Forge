import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Time } from '../common/index.js';
import { EcsWorld } from '../ecs/ecs-world.js';
import { Game } from './game.js';

describe('Game', () => {
  let time: Time;
  let world: EcsWorld;
  let container: HTMLElement;
  let game: Game;
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    time = new Time();
    world = new EcsWorld();
    container = document.createElement('div');
    game = new Game(time, [world], container);

    rafCallbacks = [];

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.push(callback);

      return rafCallbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  // Invokes the most recently scheduled `requestAnimationFrame` callback, so
  // a test can advance the game loop by exactly one frame.
  const flushLatestAnimationFrame = (): void => {
    rafCallbacks[rafCallbacks.length - 1](0);
  };

  it('updates time with its own performance.now() reading rather than the requestAnimationFrame timestamp argument', () => {
    const updateSpy = vi.spyOn(time, 'update');

    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2000);

    game.run();

    expect(updateSpy).toHaveBeenCalledWith(1000);
    expect(rafCallbacks).toHaveLength(1);

    // requestAnimationFrame's own timestamp argument isn't guaranteed to be
    // monotonic relative to a prior performance.now() reading. Invoking the
    // scheduled frame with an arbitrary value here proves the loop ignores
    // it in favor of reading performance.now() itself.
    rafCallbacks[0](999_999);

    expect(updateSpy).toHaveBeenCalledWith(2000);
    expect(updateSpy).not.toHaveBeenCalledWith(999_999);
  });

  it('updates every world once per frame', () => {
    const updateSpy = vi.spyOn(world, 'update');

    game.run();
    flushLatestAnimationFrame();

    expect(updateSpy).toHaveBeenCalledTimes(1);

    flushLatestAnimationFrame();

    expect(updateSpy).toHaveBeenCalledTimes(2);
  });

  it('schedules another frame after each update', () => {
    game.run();
    flushLatestAnimationFrame();
    flushLatestAnimationFrame();

    expect(rafCallbacks).toHaveLength(3);
  });

  it('stops every world when the game stops', () => {
    const stopSpy = vi.spyOn(world, 'stop');

    game.run();
    game.stop();

    expect(stopSpy).toHaveBeenCalled();
  });

  it('cancels the scheduled frame when stopped', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

    game.run();
    game.stop();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('stopping without having run does not throw', () => {
    const stopSpy = vi.spyOn(world, 'stop');

    expect(() => game.stop()).not.toThrow();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('running twice in a row only schedules one loop', () => {
    game.run();
    game.run();

    expect(rafCallbacks).toHaveLength(1);
  });
});
