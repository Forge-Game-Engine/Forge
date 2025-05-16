type Listener<T> = (eventData: T) => void;

/**
 * An parameterized event that can be raised and listened to.
 *
 * @template TInput - The type of the input parameter for the listeners.
 */
export class ParameterizedForgeEvent<TInput = null> {
  /**
   * The name of the event.
   */
  public name: string;

  /**
   * The list of listeners registered to this event.
   */
  private _listeners: Listener<TInput>[];

  /**
   * Gets the list of listeners registered to this event.
   */
  get listeners() {
    return this._listeners;
  }

  /**
   * Creates a new ParameterizedEvent instance.
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
  public registerListener(listener: Listener<TInput>) {
    this._listeners.push(listener);
  }

  /**
   * Deregisters a listener from the event.
   * @param listener - The listener to deregister.
   */
  public deregisterListener(listener: Listener<TInput>) {
    this._listeners = this._listeners.filter((l) => l !== listener);
  }

  /**
   * Clears all listeners from the event.
   */
  public clear() {
    this._listeners = [];
  }

  /**
   * Raises the event, calling all registered listeners with the provided input.
   * @param input - The input parameter to pass to the listeners.
   */
  public raise(input: TInput) {
    for (const listener of this._listeners) {
      try {
        listener(input);
      } catch (error) {
        console.error(`Error in listener for event ${this.name}:`, error);

        throw error;
      }
    }
  }
}
