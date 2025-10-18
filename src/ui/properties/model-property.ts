import { EventCallback } from '@rive-app/webgl2';
import { ParameterizedForgeEvent } from 'forge/events';

interface RivePropertyInstanceValue<T> {
  get value(): T;
  get name(): string;
  set value(val: T);
  on(callback: EventCallback): void;
}

/**
 * Represents a model property that can be used in a view model.
 * This class encapsulates a Rive property instance value and provides an event
 * that is raised whenever the property value changes.
 *
 * @template TInstanceValue - The type of the Rive property instance value.
 * @template T - The type of the value held by the property.
 */
export class ModelProperty<
  TInstanceValue extends RivePropertyInstanceValue<T>,
  T,
> {
  /**
   * Event that is raised when the property value changes.
   * The event provides the new value of the property.
   */
  public readonly onChangeEvent: ParameterizedForgeEvent<T>;

  private readonly _property: TInstanceValue;

  /**
   * Creates a new instance of the ModelProperty class.
   * It initializes the property and sets up the change event listener.
   *
   * @param property - The Rive property instance value to encapsulate.
   */
  constructor(property: TInstanceValue) {
    this._property = property;

    this.onChangeEvent = new ParameterizedForgeEvent<T>(
      `${property.name}Changed`,
    );

    this._property.on(() => {
      this.onChangeEvent.raise(this.value);
    });
  }

  /**
   * Gets the value of the property.
   */
  get value(): T {
    return this._property.value;
  }

  /**
   * Sets the value of the property.
   *
   * @param value - The new value to set for the property.
   */
  set value(value: T) {
    this._property.value = value;
  }
}
