/**
 * The entry stored for a persistent state isn't a JSON object: something
 * else wrote it, or it's damaged. The parse error, if any, is its `cause`.
 */
export class PersistentStateFormatError extends Error {
  /** The name of the persistent state the entry is stored under. */
  public readonly stateName: string;

  /**
   * Creates a persistent state format error.
   * @param stateName - The name of the persistent state the entry is stored under.
   * @param cause - The error that caused it, if any.
   */
  constructor(stateName: string, cause?: unknown) {
    super(
      `Unable to load persistent state "${stateName}": its stored entry isn't a JSON object.`,
      { cause },
    );
    this.name = 'PersistentStateFormatError';
    this.stateName = stateName;
  }
}

/**
 * A value of a persistent state doesn't have its default's type, isn't a
 * finite number, or fails its validator. Thrown for a stored value when
 * the state loads, and for a value passed to `set`.
 */
export class PersistentStateValueError extends Error {
  /** The name of the persistent state the value is for. */
  public readonly stateName: string;

  /** The field the value is for. */
  public readonly field: string;

  /** The value, as stored or as passed to `set`. */
  public readonly value: unknown;

  /**
   * Creates a persistent state value error.
   * @param stateName - The name of the persistent state the value is for.
   * @param field - The field the value is for.
   * @param value - The value, as stored or as passed to `set`.
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
