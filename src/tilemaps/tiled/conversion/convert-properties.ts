// Converts Tiled's colors and custom properties. Not exported from the
// package.

import { Color } from '../../../rendering/color.js';
import type { TilePropertyValue } from '../../tile-set/tile-set.js';
import type { TiledPropertyFile } from '../file-data/tiled-file-data.js';
import type { TiledProperties, TiledProperty } from '../tiled-map.js';

/**
 * Writes a color as Tiled does with its alpha first, `#aarrggbb`.
 * @param text - A color as Tiled writes it: `#RRGGBB` or `#AARRGGBB`, the
 * `#` optional, or `''`.
 * @returns The color as `#aarrggbb`, or `''` for an empty color.
 */
export const normalizeTiledColor = (text: string): string => {
  if (text === '') {
    return '';
  }

  const hex = (text.startsWith('#') ? text.slice(1) : text).toLowerCase();
  const alpha = hex.length === 6 ? 'ff' : '';

  return `#${alpha}${hex}`;
};

/**
 * Converts a color as Tiled writes it, alpha first.
 * @param text - `#RRGGBB` or `#AARRGGBB`, the `#` optional, or `''`.
 * @returns The color, or `null` for an empty color.
 */
export const parseTiledColor = (text: string): Color | null => {
  const argb = normalizeTiledColor(text);

  if (argb === '') {
    return null;
  }

  const channel = (index: number): number =>
    Number.parseInt(argb.slice(index, index + 2), 16) / 255;

  return new Color(channel(3), channel(5), channel(7), channel(1));
};

/**
 * Resolves a `file` property against the file it's written in.
 * @param path - The property's value.
 * @param baseUrl - The URL of the file the property is written in.
 * @returns The absolute URL, or `''` if no file was chosen.
 */
const resolveFileProperty = (path: string, baseUrl: string): string =>
  path === '' ? '' : new URL(path, baseUrl).href;

const toTiledProperty = (
  property: TiledPropertyFile,
  baseUrl: string,
): TiledProperty => {
  const { type, value } = property;

  if (type === 'color') {
    return { type, value: parseTiledColor(String(value)) };
  }

  if (type === 'file') {
    return { type, value: resolveFileProperty(String(value), baseUrl) };
  }

  if (type === 'bool') {
    return { type, value: value === true };
  }

  if (type === 'string') {
    return { type, value: String(value) };
  }

  return { type, value: Number(value) };
};

/**
 * Converts a list of custom properties to properties by name. A later
 * property with the same name replaces an earlier one.
 * @param properties - The properties, as written in the file.
 * @param baseUrl - The URL of the file they're written in.
 * @returns The properties, frozen.
 */
export const toTiledProperties = (
  properties: readonly TiledPropertyFile[],
  baseUrl: string,
): TiledProperties => {
  const result: Record<string, TiledProperty> = {};

  for (const property of properties) {
    result[property.name] = Object.freeze(toTiledProperty(property, baseUrl));
  }

  return Object.freeze(result);
};

/**
 * Converts a tile's custom properties to the values a tile set stores:
 * numbers and booleans as they are, a color as its `#aarrggbb` string (or
 * `''`), a file as its absolute URL (or `''`) and an object reference as
 * its id.
 * @param properties - The properties, as written in the file.
 * @param baseUrl - The URL of the file they're written in.
 * @returns The values by name.
 */
export const toTilePropertyValues = (
  properties: readonly TiledPropertyFile[],
  baseUrl: string,
): Record<string, TilePropertyValue> => {
  const result: Record<string, TilePropertyValue> = {};

  for (const { name, type, value } of properties) {
    if (type === 'color') {
      result[name] = normalizeTiledColor(String(value));
    } else if (type === 'file') {
      result[name] = resolveFileProperty(String(value), baseUrl);
    } else {
      result[name] = value;
    }
  }

  return result;
};
