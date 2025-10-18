/* eslint-disable @typescript-eslint/unbound-method */
import { type Stoppable } from '../common';
import type { World } from './world';
import { ForgeEvent } from '../events';
import { createContainer } from '../utilities';

/**
 * A game that manages worlds and handles the game loop.
 */
export class Game implements Stoppable {
  /**
   * Event triggered when the window is resized.
   */
  public readonly onWindowResize: ForgeEvent;

  /**
   * The container element for the game.
   * This is where the game will render its worlds.
   */
  public readonly container: HTMLElement;

  /**
   * The set of worlds managed by the game.
   */
  private readonly _worlds: Set<World>;

  /**
   * Creates a new Game instance.
   * @param container - The HTML element that will contain the game.
   */
  constructor(container?: HTMLElement | string) {
    this._worlds = new Set<World>();
    this.container = this._determineContainer(container);

    this.onWindowResize = new ForgeEvent('window-resize');

    window.addEventListener('resize', () => {
      this.onWindowResize.raise();
    });
  }

  /**
   * Starts the game loop.
   * @param time - The initial time value.
   */
  public run(time = 0): void {
    for (const world of this._worlds) {
      world.update(time);
    }

    requestAnimationFrame((t) => this.run(t));
  }

  /**
   * Registers a world to the game.
   * @param world - The world to register.
   */
  public registerWorld(world: World): void {
    this._worlds.add(world);
  }

  /**
   * Deregisters a world from the game.
   * @param world - The world to deregister.
   */
  public deregisterWorld(world: World): void {
    world.stop();
    this._worlds.delete(world);
  }

  /**
   * Swaps the current world with a new one.
   * This deregisters all existing worlds and registers the new world.
   * @param world - The new world to switch to.
   */
  public swapToWorld(world: World): void {
    for (const existingWorld of this._worlds) {
      this.deregisterWorld(existingWorld);
    }

    this.registerWorld(world);
  }

  /**
   * Stops the game and all registered worlds.
   */
  public stop(): void {
    window.removeEventListener('resize', this.onWindowResize.raise);

    for (const world of this._worlds) {
      world.stop();
    }
  }

  private _determineContainer(container?: HTMLElement | string): HTMLElement {
    if (typeof container === 'string') {
      return createContainer(container);
    }

    if (container instanceof HTMLElement) {
      return container as HTMLDivElement;
    }

    return createContainer('forge-game-container');
  }
}
