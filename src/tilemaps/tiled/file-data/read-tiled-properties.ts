// Reads Tiled's custom properties and colors. Not exported from the
// package.

import {
  joinJsonPath,
  JsonObject,
  readBooleanField,
  readEnumField,
  readIntegerField,
  readNumberField,
  readOptionalObjectArrayField,
  readOptionalStringField,
  readStringField,
} from './json-reader.js';
import type {
  TiledPropertyFile,
  TiledPropertyType,
} from './tiled-file-data.js';

/** The most custom properties one object, layer, tile or file may have. */
const maxProperties = 4096;

/** `#RRGGBB` or `#AARRGGBB`, the `#` optional, as Tiled writes colors. */
const tiledColorPattern = /^#?(?:[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Whether a string is a color as Tiled writes it.
 * @param text - The string.
 * @returns `true` for `#RRGGBB` or `#AARRGGBB` (the `#` optional).
 */
export const isTiledColor = (text: string): boolean =>
  tiledColorPattern.test(text);

/**
 * Reads a color field.
 * @param object - The object holding the field.
 * @param key - The field's name.
 * @returns The color as written, or `null` if the field is missing.
 * @throws An error if the field isn't a color string.
 */
export const readOptionalColorField = (
  object: JsonObject,
  key: string,
): string | null => {
  const color = readOptionalStringField(object, key);

  if (color !== null && !isTiledColor(color)) {
    object.fail(
      `${joinJsonPath(object.path, key)} must be a color written #RRGGBB or #AARRGGBB, got "${color}".`,
    );
  }

  return color;
};

type PropertyValueReader = (entry: JsonObject) => string | number | boolean;

const readColorValue: PropertyValueReader = (entry) => {
  const color = readStringField(entry, 'value', '');

  if (color !== '' && !isTiledColor(color)) {
    entry.fail(
      `${joinJsonPath(entry.path, 'value')} must be a color written #RRGGBB or #AARRGGBB, or empty, got "${color}".`,
    );
  }

  return color;
};

const propertyValueReaders: Readonly<
  Record<TiledPropertyType, PropertyValueReader>
> = {
  string: (entry) => readStringField(entry, 'value', ''),
  file: (entry) => readStringField(entry, 'value', ''),
  color: readColorValue,
  int: (entry) =>
    readIntegerField(entry, 'value', {
      minimum: Number.MIN_SAFE_INTEGER,
      fallback: 0,
    }),
  float: (entry) => readNumberField(entry, 'value', 0),
  bool: (entry) => readBooleanField(entry, 'value', false),
  object: (entry) =>
    readIntegerField(entry, 'value', { minimum: 0, fallback: 0 }),
};

const propertyTypes: readonly (TiledPropertyType | 'class')[] = [
  'string',
  'int',
  'float',
  'bool',
  'color',
  'file',
  'object',
  'class',
];

/**
 * Reads an object's `properties`. Properties of type `class` (Tiled's
 * custom property types) are left out.
 * @param object - The object holding the properties.
 * @returns The properties, in file order.
 * @throws An error if a property is malformed.
 */
export const readTiledProperties = (
  object: JsonObject,
): TiledPropertyFile[] => {
  const entries =
    readOptionalObjectArrayField(object, 'properties', maxProperties) ?? [];
  const properties: TiledPropertyFile[] = [];

  for (const entry of entries) {
    const name = readStringField(entry, 'name');
    const type = readEnumField(entry, 'type', propertyTypes, 'string');

    if (type === 'class') {
      continue;
    }

    properties.push({ name, type, value: propertyValueReaders[type](entry) });
  }

  return properties;
};
