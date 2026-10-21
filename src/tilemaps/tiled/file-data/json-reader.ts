// Reads parsed JSON field by field, keeping each value's JSON path for
// error messages. Not exported from the package.

/** Throws an error about a file, for a reason that names the bad field. */
export type FailFile = (reason: string) => never;

/** A JSON object being read, and where it is in its file. */
export interface JsonObject {
  /** The object's fields. */
  readonly fields: Readonly<Record<string, unknown>>;

  /** The object's JSON path, such as `layers[2].chunks[0]`; `''` for the root. */
  readonly path: string;

  /** Throws an error naming the object's file. */
  readonly fail: FailFile;
}

/** The longest value an error message quotes. */
const maxQuotedLength = 40;

/**
 * Describes a JSON value for an error message.
 * @param value - The value.
 * @returns The value as JSON, shortened if it's long.
 */
export const describeJsonValue = (value: unknown): string => {
  if (value === undefined) {
    return 'nothing';
  }

  const text = JSON.stringify(value);

  return text.length > maxQuotedLength
    ? `${text.slice(0, maxQuotedLength)}...`
    : text;
};

/**
 * The path of a field of an object.
 * @param path - The object's path.
 * @param key - The field's name, or an array index.
 * @returns The field's path.
 */
export const joinJsonPath = (path: string, key: string | number): string => {
  if (typeof key === 'number') {
    return `${path}[${key}]`;
  }

  return path === '' ? key : `${path}.${key}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reads a value as a JSON object.
 * @param value - The value.
 * @param path - Its JSON path, `''` for the root.
 * @param fail - Throws an error naming the file.
 * @returns The object.
 * @throws An error if the value isn't a JSON object.
 */
export const readJsonObject = (
  value: unknown,
  path: string,
  fail: FailFile,
): JsonObject => {
  if (!isRecord(value)) {
    return fail(
      `${path === '' ? 'the root value' : path} must be an object, got ${describeJsonValue(value)}.`,
    );
  }

  return { fields: value, path, fail };
};

const failField = (
  object: JsonObject,
  key: string,
  requirement: string,
): never => {
  const value = object.fields[key];
  const path = joinJsonPath(object.path, key);

  if (value === undefined) {
    return object.fail(`${path} is missing; it must be ${requirement}.`);
  }

  return object.fail(
    `${path} must be ${requirement}, got ${describeJsonValue(value)}.`,
  );
};

/**
 * Reads a field that is a JSON object.
 * @param object - The object holding the field.
 * @param key - The field's name.
 * @returns The field's object, or `null` if the field is missing.
 * @throws An error if the field is there and isn't an object.
 */
export const readOptionalObjectField = (
  object: JsonObject,
  key: string,
): JsonObject | null => {
  const value = object.fields[key];

  if (value === undefined) {
    return null;
  }

  return readJsonObject(value, joinJsonPath(object.path, key), object.fail);
};

/**
 * Reads a field that is an array of JSON objects.
 * @param object - The object holding the field.
 * @param key - The field's name.
 * @param maxLength - The most entries the array may have.
 * @returns The entries, or `null` if the field is missing.
 * @throws An error if the field is there and isn't an array of objects, or
 * has more than `maxLength` entries.
 */
export const readOptionalObjectArrayField = (
  object: JsonObject,
  key: string,
  maxLength: number = Number.MAX_SAFE_INTEGER,
): JsonObject[] | null => {
  const value = object.fields[key];

  if (value === undefined) {
    return null;
  }

  const path = joinJsonPath(object.path, key);

  if (!Array.isArray(value)) {
    return failField(object, key, 'an array');
  }

  if (value.length > maxLength) {
    return object.fail(
      `${path} has ${value.length} entries, and at most ${maxLength} are supported.`,
    );
  }

  return value.map((entry: unknown, index) =>
    readJsonObject(entry, joinJsonPath(path, index), object.fail),
  );
};

/**
 * Reads a required field that is an array of JSON objects.
 * @param object - The object holding the field.
 * @param key - The field's name.
 * @param maxLength - The most entries the array may have.
 * @returns The entries.
 * @throws An error if the field is missing or isn't an array of objects, or
 * has more than `maxLength` entries.
 */
export const readObjectArrayField = (
  object: JsonObject,
  key: string,
  maxLength?: number,
): JsonObject[] =>
  readOptionalObjectArrayField(object, key, maxLength) ??
  failField(object, key, 'an array');

/**
 * Reads a string field.
 * @param object - The object holding the field.
 * @param key - The field's name.
 * @param fallback - The value of a missing field. Without one, the field is
 * required.
 * @returns The string.
 * @throws An error if the field isn't a string, or is missing and has no
 * fallback.
 */
export const readStringField = (
  object: JsonObject,
  key: string,
  fallback?: string,
): string => {
  const value = object.fields[key];

  if (value === undefined && fallback !== undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return failField(object, key, 'a string');
  }

  return value;
};

/**
 * Reads a string field that may be missing.
 * @param object - The object holding the field.
 * @param key - The field's name.
 * @returns The string, or `null` if the field is missing.
 * @throws An error if the field is there and isn't a string.
 */
export const readOptionalStringField = (
  object: JsonObject,
  key: string,
): string | null =>
  object.fields[key] === undefined ? null : readStringField(object, key);

/**
 * Reads a finite number field.
 * @param object - The object holding the field.
 * @param key - The field's name.
 * @param fallback - The value of a missing field. Without one, the field is
 * required.
 * @returns The number.
 * @throws An error if the field isn't a finite number, or is missing and
 * has no fallback.
 */
export const readNumberField = (
  object: JsonObject,
  key: string,
  fallback?: number,
): number => {
  const value = object.fields[key];

  if (value === undefined && fallback !== undefined) {
    return fallback;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return failField(object, key, 'a finite number');
  }

  return value;
};

/** Limits on a whole number field, for {@link readIntegerField}. */
export interface IntegerFieldLimits {
  /** The smallest value allowed. */
  readonly minimum: number;

  /** The largest value allowed. Defaults to `Number.MAX_SAFE_INTEGER`. */
  readonly maximum?: number;

  /** The value of a missing field. Without one, the field is required. */
  readonly fallback?: number;
}

const describeIntegerRange = (minimum: number, maximum: number): string => {
  if (maximum !== Number.MAX_SAFE_INTEGER) {
    return `a whole number from ${minimum} to ${maximum}`;
  }

  if (minimum === 0) {
    return 'a whole number of 0 or more';
  }

  if (minimum === 1) {
    return 'a whole number greater than 0';
  }

  return `a whole number of ${minimum} or more`;
};

/**
 * Reads a whole number field.
 * @param object - The object holding the field.
 * @param key - The field's name.
 * @param limits - The range allowed, and the value of a missing field.
 * @returns The number.
 * @throws An error if the field isn't a whole number in range, or is
 * missing and has no fallback.
 */
export const readIntegerField = (
  object: JsonObject,
  key: string,
  limits: IntegerFieldLimits,
): number => {
  const { minimum, maximum = Number.MAX_SAFE_INTEGER, fallback } = limits;
  const value = object.fields[key];

  if (value === undefined && fallback !== undefined) {
    return fallback;
  }

  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    return failField(object, key, describeIntegerRange(minimum, maximum));
  }

  return value;
};

/**
 * Reads a boolean field.
 * @param object - The object holding the field.
 * @param key - The field's name.
 * @param fallback - The value of a missing field.
 * @returns The boolean.
 * @throws An error if the field is there and isn't a boolean.
 */
export const readBooleanField = (
  object: JsonObject,
  key: string,
  fallback: boolean,
): boolean => {
  const value = object.fields[key];

  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'boolean') {
    return failField(object, key, 'true or false');
  }

  return value;
};

/**
 * Reads a string field that must be one of a few values.
 * @param object - The object holding the field.
 * @param key - The field's name.
 * @param values - The values allowed.
 * @param fallback - The value of a missing field. Without one, the field is
 * required.
 * @returns The value.
 * @throws An error if the field isn't one of `values`, or is missing and
 * has no fallback.
 */
export const readEnumField = <T extends string>(
  object: JsonObject,
  key: string,
  values: readonly T[],
  fallback?: T,
): T => {
  const value = object.fields[key];

  if (value === undefined && fallback !== undefined) {
    return fallback;
  }

  const match = values.find((allowed) => allowed === value);

  if (match === undefined) {
    const quoted = values.map((allowed) => JSON.stringify(allowed));

    return failField(object, key, `one of ${quoted.join(', ')}`);
  }

  return match;
};
