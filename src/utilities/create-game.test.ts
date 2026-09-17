import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGame, EcsWorld, Game, Time } from '../index.js';
import { createCanvas, createRenderContext } from '../rendering/index.js';

vi.mock('../rendering/index.js', () => ({
  createCanvas: vi.fn(),
  createRenderContext: vi.fn(),
}));

/**
 * jsdom doesn't implement `ResizeObserver`, and `createGame` now wires up a
 * `createContainerResizeSync` eagerly (not lazily on `game.run()`), so every
 * test needs this stand-in on the global even though none of them exercise
 * resize behavior directly.
 */
class NoopResizeObserver {
  public observe(): void {}
  public disconnect(): void {}
  public unobserve(): void {}
}

describe('createGame', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    const container = document.createElement('div');
    container.id = 'game-container';
    document.body.appendChild(container);

    vi.stubGlobal('ResizeObserver', NoopResizeObserver);
  });

  it('returns an instance of Game', () => {
    const { game } = createGame('game-container');
    expect(game).toBeInstanceOf(Game);
  });

  it('returns an instance of EcsWorld', () => {
    const { world } = createGame('game-container');
    expect(world).toBeInstanceOf(EcsWorld);
  });

  it('returns an instance of Time', () => {
    const { time } = createGame('game-container');
    expect(time).toBeInstanceOf(Time);
  });

  it('creates a canvas', () => {
    createGame('game-container');

    expect(createCanvas).toHaveBeenCalled();
  });

  it('creates a render context', () => {
    createGame('game-container');

    expect(createRenderContext).toHaveBeenCalled();
  });

  it('returns a resize sync', () => {
    const { resizeSync } = createGame('game-container');
    expect(typeof resizeSync.stop).toBe('function');
  });

  it('throws an error if the container element is not found', () => {
    expect(() => createGame('non-existent-container')).toThrow(
      'No DOM element with ID "non-existent-container" found.',
    );
  });
});
