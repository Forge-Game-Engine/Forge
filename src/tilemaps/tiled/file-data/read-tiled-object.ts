// Reads one object of an object layer, a tile's collision group or a
// template. Not exported from the package.

import type { Vector2 } from '../../../math/index.js';
import {
  joinJsonPath,
  JsonObject,
  readBooleanField,
  readEnumField,
  readIntegerField,
  readNumberField,
  readOptionalObjectArrayField,
  readOptionalObjectField,
  readStringField,
} from './json-reader.js';
import {
  readOptionalColorField,
  readTiledProperties,
} from './read-tiled-properties.js';
import type {
  TiledObjectFile,
  TiledObjectShapeKind,
  TiledTextFile,
} from './tiled-file-data.js';

/** The most points a polygon or polyline may have. */
const maxPoints = 65_536;

const maxGid = 0xffff_ffff;

const readPoints = (
  object: JsonObject,
  key: 'polygon' | 'polyline',
  minimum: number,
): Vector2[] | null => {
  const entries = readOptionalObjectArrayField(object, key, maxPoints);

  if (entries === null) {
    return null;
  }

  if (entries.length < minimum) {
    object.fail(
      `${joinJsonPath(object.path, key)} has ${entries.length} points, and a ${key} needs at least ${minimum}.`,
    );
  }

  return entries.map((entry) => ({
    x: readNumberField(entry, 'x'),
    y: readNumberField(entry, 'y'),
  }));
};

const readShapePoints = (
  object: JsonObject,
  kind: TiledObjectShapeKind,
): Vector2[] | null => {
  if (kind === 'polygon') {
    return readPoints(object, 'polygon', 3);
  }

  if (kind === 'polyline') {
    return readPoints(object, 'polyline', 2);
  }

  return null;
};

const readText = (text: JsonObject): TiledTextFile => ({
  text: readStringField(text, 'text', ''),
  pixelSize: readIntegerField(text, 'pixelsize', { minimum: 1, fallback: 16 }),
  color: readOptionalColorField(text, 'color'),
  fontFamily: readStringField(text, 'fontfamily', 'sans-serif'),
  bold: readBooleanField(text, 'bold', false),
  italic: readBooleanField(text, 'italic', false),
  wrap: readBooleanField(text, 'wrap', false),
  horizontalAlignment: readEnumField(
    text,
    'halign',
    ['left', 'center', 'right', 'justify'],
    'left',
  ),
  verticalAlignment: readEnumField(
    text,
    'valign',
    ['top', 'center', 'bottom'],
    'top',
  ),
});

const readKind = (
  object: JsonObject,
  gid: number | null,
  hasText: boolean,
): TiledObjectShapeKind => {
  const flags: [boolean, TiledObjectShapeKind][] = [
    [gid !== null, 'tile'],
    [hasText, 'text'],
    [readBooleanField(object, 'point', false), 'point'],
    [readBooleanField(object, 'ellipse', false), 'ellipse'],
    [readBooleanField(object, 'capsule', false), 'capsule'],
    [object.fields.polygon !== undefined, 'polygon'],
    [object.fields.polyline !== undefined, 'polyline'],
  ];

  return flags.find(([isKind]) => isKind)?.[1] ?? 'rectangle';
};

/**
 * Reads an object, with Tiled's defaults for the fields it leaves out.
 * @param object - The object's JSON, with any template already merged in.
 * @param isTemplate - Whether it's a template's object, which has no `id`,
 * `x` or `y` of its own.
 * @returns The object.
 * @throws An error if a field is malformed.
 */
export const readTiledObject = (
  object: JsonObject,
  isTemplate: boolean,
): TiledObjectFile => {
  const required = isTemplate ? 0 : undefined;
  const gidValue = readIntegerField(object, 'gid', {
    minimum: 0,
    maximum: maxGid,
    fallback: 0,
  });
  const gid = gidValue === 0 ? null : gidValue;
  const text = readOptionalObjectField(object, 'text');
  const kind = readKind(object, gid, text !== null);

  return {
    id: readIntegerField(object, 'id', { minimum: 0, fallback: required }),
    name: readStringField(object, 'name', ''),
    type:
      object.fields.type === undefined
        ? readStringField(object, 'class', '')
        : readStringField(object, 'type'),
    x: readNumberField(object, 'x', required),
    y: readNumberField(object, 'y', required),
    width: readNumberField(object, 'width', 0),
    height: readNumberField(object, 'height', 0),
    rotation: readNumberField(object, 'rotation', 0),
    visible: readBooleanField(object, 'visible', true),
    kind,
    gid,
    points: readShapePoints(object, kind),
    text: text === null ? null : readText(text),
    properties: readTiledProperties(object),
    path: object.path,
  };
};
