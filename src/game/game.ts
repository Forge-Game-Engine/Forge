import { type Stoppable, Time } from '../common';
import { ForgeEvent } from '../events';
import { Scene } from './scene';

/**
 * A game that manages scenes and handles the game loop.
 */
export class Game implements Stoppable {
  /**
   * Event triggered when the window is resized.
   */
  public onWindowResize: ForgeEvent;

  /**
   * The current time instance.
   */
  private readonly _time: Time;

  /**
   * The set of scenes managed by the game.
   */
  private readonly _scenes: Set<Scene>;

  /**
   * Creates a new Game instance.
   */
  constructor() {
    this._time = new Time();
    this._scenes = new Set<Scene>();
    this.onWindowResize = new ForgeEvent('window-resize');

    window.addEventListener('resize', () => {
      this.onWindowResize.raise();
    });
  }

  /**
   * Gets the current time instance.
   */
  get time(): Time {
    return this._time;
  }

  /**
   * Starts the game loop.
   * @param time - The initial time value.
   */
  public run(time = 0) {
    this._time.update(time);

    for (const scene of this._scenes) {
      scene.update(this._time);
    }

    requestAnimationFrame((t) => this.run(t));
  }

  /**
   * Registers a scene to the game.
   * @param scene - The scene to register.
   */
  public registerScene(scene: Scene) {
    this._scenes.add(scene);
  }

  /**
   * Deregisters a scene from the game.
   * @param scene - The scene to deregister.
   */
  public deregisterScene(scene: Scene) {
    scene.stop();
    this._scenes.delete(scene);
  }

  /**
   * Stops the game and all registered scenes.
   */
  public stop() {
    window.removeEventListener('resize', this.onWindowResize.raise);

    for (const scene of this._scenes) {
      scene.stop();
    }
  }
}
