import type { ParameterizedForgeEvent } from './parameterized-forge-event';

/**
 * The `EventDispatcher` class is responsible for managing event listeners
 * and dispatching events to those listeners. It allows adding, removing,
 * and dispatching events with associated data.
 *
 * @template TData - The type of data associated with the events.
 */
export class EventDispatcher<TData> {
  /**
   * A map of event types to sets of event listeners.
   */
  private readonly _listeners: Map<string, Set<ParameterizedForgeEvent<TData>>>;

  /**
   * Creates a new instance of the `EventDispatcher` class.
   */
  constructor() {
    this._listeners = new Map();
  }

  /**
   * Adds an event listener for the specified event type.
   *
   * @param type - The type of the event.
   * @param event - The event listener to add.
   */
  public addEventListener(
    type: string,
    event: ParameterizedForgeEvent<TData>,
  ): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }

    this._listeners.get(type)?.add(event);
  }

  /**
   * Removes an event listener for the specified event type.
   *
   * @param type - The type of the event.
   * @param event - The event listener to remove.
   */
  public removeEventListener(
    type: string,
    event: ParameterizedForgeEvent<TData>,
  ): void {
    this._listeners.get(type)?.delete(event);
  }

  /**
   * Dispatches an event of the specified type to all registered listeners.
   *
   * @param type - The type of the event.
   * @param data - The data associated with the event.
   */
  public dispatchEvent(type: string, data: TData): void {
    const events = this._listeners.get(type);

    if (events) {
      events.forEach((event) => {
        event.raise(data);
      });
    }
  }
}
