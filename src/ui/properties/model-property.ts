import { EventCallback } from '@rive-app/webgl2';
import { ParameterizedForgeEvent } from '../../events';

interface RivePropertyInstanceValue<T> {
  get value(): T;
  get name(): string;
  set value(val: T);
  on(callback: EventCallback): void;
}

export class ModelProperty<
  TInstanceValue extends RivePropertyInstanceValue<T>,
  T,
> {
  public readonly onChangeEvent: ParameterizedForgeEvent<T>;

  private readonly _property: TInstanceValue;

  constructor(property: TInstanceValue | null) {
    if (!property) {
      throw new Error('Property cannot be null');
    }

    this._property = property;

    this.onChangeEvent = new ParameterizedForgeEvent<T>(
      `${property.name}Changed`,
    );

    this._property.on(() => {
      this.onChangeEvent.raise(this.value);
    });
  }

  get value(): T {
    return this._property.value;
  }

  set value(value: T) {
    this._property.value = value;
  }
}
