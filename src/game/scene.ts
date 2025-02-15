import { Stoppable, Time } from '../common';
import { Updatable } from './interfaces';

/**
 * A scene in the game, which can contain updatable and stoppable objects.
 */
export class Scene implements Updatable, Stoppable {
  /**
   * The name of the scene.
   */
  public name: string;

  /**
   * The set of updatable objects in the scene.
   */
  private _updatables: Set<Updatable>;

  /**
   * The set of stoppable objects in the scene.
   */
  private _stoppables: Set<Stoppable>;

  /**
   * Creates a new Scene instance.
   * @param name - The name of the scene.
   */
  constructor(name: string) {
    this.name = name;

    this._updatables = new Set<Updatable>();
    this._stoppables = new Set<Stoppable>();
  }

  /**
   * Registers an updatable object to the scene.
   * @param updatable - The updatable object to register.
   */
  public registerUpdatable(updatable: Updatable) {
    this._updatables.add(updatable);
  }

  /**
   * Deregisters an updatable object from the scene.
   * @param updatable - The updatable object to deregister.
   */
  public deregisterUpdatable(updatable: Updatable) {
    this._updatables.delete(updatable);
  }

  /**
   * Registers a stoppable object to the scene.
   * @param stoppable - The stoppable object to register.
   */
  public registerStoppable(stoppable: Stoppable) {
    this._stoppables.add(stoppable);
  }

  /**
   * Deregisters a stoppable object from the scene.
   * @param stoppable - The stoppable object to deregister.
   */
  public deregisterStoppable(stoppable: Stoppable) {
    this._stoppables.delete(stoppable);
  }

  /**
   * Updates all registered updatable objects in the scene.
   * @param time - The current time.
   */
  public update(time: Time) {
    for (const updatable of this._updatables) {
      updatable.update(time);
    }
  }

  /**
   * Stops all registered stoppable objects in the scene.
   */
  public stop() {
    for (const stoppable of this._stoppables) {
      stoppable.stop();
    }
  }
}
