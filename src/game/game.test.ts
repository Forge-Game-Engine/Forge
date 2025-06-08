import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from './game';
import { Time } from '../common';
import { Scene } from './scene';
import { createContainer } from '../utilities';

describe('Game', () => {
  let game: Game;
  let scene: Scene;

  beforeEach(() => {
    game = new Game(createContainer('test'));
    scene = new Scene('foo');
  });

  it('should initialize with a Time instance and an empty set of scenes', () => {
    expect(game['_time']).toBeInstanceOf(Time);
    expect(game['_scenes'].size).toBe(0);
  });

  it('should register a scene to the game', () => {
    game.registerScene(scene);
    expect(game['_scenes'].has(scene)).toBe(true);
  });

  it('should deregister a scene from the game', () => {
    game.registerScene(scene);
    game.deregisterScene(scene);
    expect(game['_scenes'].has(scene)).toBe(false);
  });

  it('should update all registered scenes in the game loop', () => {
    game.registerScene(scene);
    const updateSpy = vi.spyOn(scene, 'update');
    game.run(0);
    expect(updateSpy).toHaveBeenCalledWith(game['_time']);
  });

  it('should stop all registered scenes and remove resize event listener', () => {
    game.registerScene(scene);
    const stopSpy = vi.spyOn(scene, 'stop');
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
