import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from './game';
import { createContainer } from '../utilities';
import { World } from './world';

describe('Game', () => {
  let game: Game;
  let world: World;

  beforeEach(() => {
    game = new Game(createContainer('test'));
    world = new World('foo');
  });

  it('should initialize with an empty set of worlds', () => {
    expect(game['_worlds'].size).toBe(0);
  });

  it('should register a world to the game', () => {
    game.registerWorld(world);
    expect(game['_worlds'].has(world)).toBe(true);
  });

  it('should deregister a world from the game', () => {
    game.registerWorld(world);
    game.deregisterWorld(world);
    expect(game['_worlds'].has(world)).toBe(false);
  });

  it('should stop all registered worlds and remove resize event listener', () => {
    game.registerWorld(world);
    const stopSpy = vi.spyOn(world, 'stop');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    game.stop();
    expect(stopSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      game.onWindowResize.raise,
    );
  });

  it('should raise the onWindowResize event when the window is resized', () => {
    const raiseSpy = vi.spyOn(game.onWindowResize, 'raise');
    window.dispatchEvent(new Event('resize'));
    expect(raiseSpy).toHaveBeenCalled();
  });
});
