/**
 * A value of a persistent state doesn't have its default's type, isn't a
 * finite number, or fails its validator. Thrown for a default when the
 * state is created, and for a value passed to `set`.
 */
export class PersistentStateValueError extends Error {
  /** The name of the persistent state the value is for. */
  public readonly stateName: string;

  /** The field the value is for. */
  public readonly field: string;

  /** The value, as a default or as passed to `set`. */
  public readonly value: unknown;

  /**
   * Creates a persistent state value error.
   * @param stateName - The name of the persistent state the value is for.
   * @param field - The field the value is for.
   * @param value - The value, as a default or as passed to `set`.
   */
  constructor(stateName: string, field: string, value: unknown) {
    super(
      `Invalid value ${describeValue(value)} for field "${field}" of persistent state "${stateName}".`,
    );
    this.name = 'PersistentStateValueError';
    this.stateName = stateName;
    this.field = field;
    this.value = value;
  }
}

const describeValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'object' && value !== null) {
    return Array.isArray(value) ? 'array' : 'object';
  }

  return String(value);
};
