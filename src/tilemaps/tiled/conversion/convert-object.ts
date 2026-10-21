// Converts Tiled objects to map-space data. Not exported from the package.

import {
  degreesToRadians,
  type GridLayout,
  type Vector2,
} from '../../../math/index.js';
import { Color } from '../../../rendering/color.js';
import { getTileSourceIndex } from '../../tiles/packed-tile-bits.js';
import type {
  TiledObjectAlignment,
  TiledObjectFile,
  TiledObjectShapeKind,
} from '../file-data/tiled-file-data.js';
import type {
  TiledObject,
  TiledObjectShape,
  TiledProperties,
} from '../tiled-map.js';
import type { TiledGidConverter } from './convert-gid.js';
import { parseTiledColor } from './convert-properties.js';
import { worldUnitsPerTiledPixel } from './units.js';

/** How many points an ellipse or capsule becomes in an isometric map. */
const outlinePointCount = 32;

/** What a map's objects are converted with. */
export interface ObjectConversionContext {
  /** The map's orientation. */
  readonly orientation: 'orthogonal' | 'isometric';

  /** The map's layout. */
  readonly layout: GridLayout;

  /** The map's tile height, in Tiled pixels. */
  readonly tileHeight: number;

  /** Converts the map's gids. */
  readonly convertGid: TiledGidConverter;

  /** Each source's object alignment, by source index. */
  readonly objectAlignments: readonly TiledObjectAlignment[];
}

/** An object to convert. */
export interface TiledObjectInput {
  /** The object, its template merged in. */
  readonly file: TiledObjectFile;

  /** The object's gid in the map, or `null` if it isn't a tile object. */
  readonly gid: number | null;

  /** The object's properties, its template's merged in. */
  readonly properties: TiledProperties;
}

const alignedPivots: Readonly<
  Record<Exclude<TiledObjectAlignment, 'unspecified'>, Readonly<Vector2>>
> = {
  topleft: { x: 0, y: 0 },
  top: { x: 0.5, y: 0 },
  topright: { x: 1, y: 0 },
  left: { x: 0, y: 0.5 },
  center: { x: 0.5, y: 0.5 },
  right: { x: 1, y: 0.5 },
  bottomleft: { x: 0, y: 1 },
  bottom: { x: 0.5, y: 1 },
  bottomright: { x: 1, y: 1 },
};

const getTilePivot = (
  alignment: TiledObjectAlignment,
  orientation: ObjectConversionContext['orientation'],
): Readonly<Vector2> => {
  // Tiled's unspecified alignment is bottom-left in orthogonal maps and
  // bottom-center in isometric ones.
  if (alignment === 'unspecified') {
    return orientation === 'isometric'
      ? alignedPivots.bottom
      : alignedPivots.bottomleft;
  }

  return alignedPivots[alignment];
};

/**
 * Converts a point from Tiled's object pixels to map space. In an
 * isometric map, Tiled stores objects in projected pixels, where a cell is
 * `tileheight` along each axis, so the point goes through the layout. The
 * conversion is linear, so it also converts points relative to an origin.
 */
const createProjection = (
  context: ObjectConversionContext,
): ((point: Vector2) => Vector2) => {
  if (context.orientation === 'orthogonal') {
    return (point) => ({
      x: point.x * worldUnitsPerTiledPixel,
      y: point.y * worldUnitsPerTiledPixel,
    });
  }

  const { layout, tileHeight } = context;

  return (point) =>
    layout.cellSpaceToLocal({
      x: point.x / tileHeight,
      y: point.y / tileHeight,
    });
};

const sampleEllipse = (width: number, height: number): Vector2[] =>
  Array.from({ length: outlinePointCount }, (_, index) => {
    const angle = (index / outlinePointCount) * 2 * Math.PI;

    return {
      x: (width / 2) * (1 + Math.cos(angle)),
      y: (height / 2) * (1 + Math.sin(angle)),
    };
  });

/** A capsule's outline: its two round ends, on its shorter sides. */
const sampleCapsule = (width: number, height: number): Vector2[] => {
  const horizontal = width >= height;
  const radius = (horizontal ? height : width) / 2;
  const half = outlinePointCount / 2;
  const ends: [Vector2, number][] = horizontal
    ? [
        [{ x: width - radius, y: radius }, -Math.PI / 2],
        [{ x: radius, y: radius }, Math.PI / 2],
      ]
    : [
        [{ x: radius, y: height - radius }, 0],
        [{ x: radius, y: radius }, Math.PI],
      ];

  return ends.flatMap(([center, start]) =>
    Array.from({ length: half }, (_, index) => {
      const angle = start + (index / (half - 1)) * Math.PI;

      return {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      };
    }),
  );
};

const rectangleCorners = (width: number, height: number): Vector2[] => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: height },
  { x: 0, y: height },
];

type BoxKind = 'rectangle' | 'ellipse' | 'capsule';

/** Each box-shaped kind's outline, from its width and height in Tiled pixels. */
const boxOutlines: Readonly<
  Record<BoxKind, (width: number, height: number) => Vector2[]>
> = {
  rectangle: rectangleCorners,
  ellipse: sampleEllipse,
  capsule: sampleCapsule,
};

const isBoxKind = (kind: TiledObjectShapeKind): kind is BoxKind =>
  Object.hasOwn(boxOutlines, kind);

const toShape = (
  input: TiledObjectInput,
  context: ObjectConversionContext,
  project: (point: Vector2) => Vector2,
): TiledObjectShape => {
  const { file } = input;
  const { kind } = file;
  const width = file.width * worldUnitsPerTiledPixel;
  const height = file.height * worldUnitsPerTiledPixel;
  const projectAll = (points: readonly Vector2[]): readonly Vector2[] =>
    Object.freeze(points.map((point) => Object.freeze(project(point))));

  if (isBoxKind(kind)) {
    // Projected, a box's outline is a parallelogram or a slanted oval, so
    // in an isometric map it's a polygon.
    if (context.orientation === 'isometric') {
      return {
        kind: 'polygon',
        points: projectAll(boxOutlines[kind](file.width, file.height)),
      };
    }

    return { kind, width, height };
  }

  if ((kind === 'polygon' || kind === 'polyline') && file.points) {
    return { kind, points: projectAll(file.points) };
  }

  if (file.kind === 'tile' && input.gid !== null) {
    const tile = context.convertGid(
      input.gid,
      () => `the tile object ${file.path}`,
    );

    return {
      kind: 'tile',
      tile,
      width,
      height,
      pivot: Object.freeze({
        ...getTilePivot(
          context.objectAlignments[getTileSourceIndex(tile)],
          context.orientation,
        ),
      }),
    };
  }

  if (file.kind === 'text' && file.text) {
    const { text } = file;

    return {
      kind: 'text',
      text: text.text,
      width,
      height,
      pixelSize: text.pixelSize * worldUnitsPerTiledPixel,
      // Tiled leaves out the default color, black.
      color: parseTiledColor(text.color ?? '') ?? Color.black,
      fontFamily: text.fontFamily,
      bold: text.bold,
      italic: text.italic,
      wrap: text.wrap,
      horizontalAlignment: text.horizontalAlignment,
      verticalAlignment: text.verticalAlignment,
    };
  }

  return { kind: 'point' };
};

/**
 * Converts an object to map space.
 * @param input - The object, its gid and its properties.
 * @param offset - The offset of the object's layer and groups, added up, in
 * world units.
 * @param context - The map's orientation, layout and gid converter.
 * @returns The object, frozen.
 * @throws An error if a tile object's gid isn't in the map's tilesets.
 */
export const toTiledObject = (
  input: TiledObjectInput,
  offset: Readonly<Vector2>,
  context: ObjectConversionContext,
): TiledObject => {
  const { file, properties } = input;
  const project = createProjection(context);
  const origin = project({ x: file.x, y: file.y });

  return Object.freeze({
    id: file.id,
    name: file.name,
    type: file.type,
    position: Object.freeze({ x: origin.x + offset.x, y: origin.y + offset.y }),
    rotation: degreesToRadians(file.rotation),
    visible: file.visible,
    properties,
    shape: Object.freeze(toShape(input, context, project)),
  });
};
