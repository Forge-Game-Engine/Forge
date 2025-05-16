type Listener = () => Promise<void>;

/**
 * An event that can be raised and listened to.
 */
export class ForgeEvent {
  /**
   * The name of the event.
   */
  public name: string;

  /**
   * The list of listeners registered to this event.
   */
  private _listeners: Listener[];

  /**
   * Gets the list of listeners registered to this event.
   */
  get listeners() {
    return this._listeners;
  }

  /**
   * Creates a new event.
   * @param name - The name of the event.
   */
  constructor(name: string) {
    this.name = name;
    this._listeners = [];
  }

  /**
   * Registers a listener to the event.
   * @param listener - The listener to register.
   */
  public registerListener(listener: Listener) {
    this._listeners.push(listener);
  }

  /**
   * Deregisters a listener from the event.
   * @param listener - The listener to deregister.
   */
  public deregisterListener(listener: Listener) {
    this._listeners = this._listeners.filter((l) => l !== listener);
  }

  /**
   * Clears all listeners from the event.
   */
  public clear() {
    this._listeners = [];
  }

  /**
   * Raises the event, calling all registered listeners.
   */
  public raise() {
    for (const listener of this._listeners) {
      listener().catch((error) => {
        console.error(`Error in listener for event ${this.name}:`, error);

        throw error;
      });
    }
  }
}
