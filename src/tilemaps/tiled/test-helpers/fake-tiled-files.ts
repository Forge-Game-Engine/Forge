import { vi } from 'vitest';
import type { RenderContext } from '../../../rendering/render-context.js';
import type { Texture, TextureOptions } from '../../../rendering/texture.js';
import { textureOfSize } from '../../test-helpers/create-test-tile-set.js';
import infiniteMap from './fixtures/maps/infinite.tmj?raw';
import isometricMap from './fixtures/maps/isometric.tmj?raw';
import orthogonalMap from './fixtures/maps/orthogonal.tmj?raw';
import chestTemplate from './fixtures/templates/chest.tj?raw';
import propsTileSet from './fixtures/tilesets/props.tsj?raw';
import terrainTileSet from './fixtures/tilesets/terrain.tsj?raw';

/** The URL the fixture folder is served from: jsdom's page URL. */
export const fixturesUrl = 'http://localhost:3000/';

/** The fixture files, by URL. */
export const fixtureFiles: Readonly<Record<string, string>> = {
  [`${fixturesUrl}maps/orthogonal.tmj`]: orthogonalMap,
  [`${fixturesUrl}maps/isometric.tmj`]: isometricMap,
  [`${fixturesUrl}maps/infinite.tmj`]: infiniteMap,
  [`${fixturesUrl}tilesets/props.tsj`]: propsTileSet,
  [`${fixturesUrl}tilesets/terrain.tsj`]: terrainTileSet,
  [`${fixturesUrl}templates/chest.tj`]: chestTemplate,
};

/** The size of each fixture image, by URL. */
export const fixtureImageSizes: Readonly<
  Record<string, { width: number; height: number }>
> = {
  [`${fixturesUrl}maps/terrain.png`]: { width: 32, height: 32 },
  [`${fixturesUrl}maps/iso.png`]: { width: 192, height: 96 },
  [`${fixturesUrl}tilesets/props.png`]: { width: 48, height: 32 },
  [`${fixturesUrl}images/terrain.png`]: { width: 36, height: 36 },
};

/** A path into a JSON value: object keys and array indices. */
export type JsonPath = readonly (string | number)[];

const isJsonContainer = (
  value: unknown,
): value is Record<string | number, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Reads the value at a path of a JSON value.
 * @param json - The JSON value.
 * @param path - The path.
 * @returns The value at the path.
 * @throws An error if the path leads through something that isn't an
 * object or array.
 */
export const getJsonAt = (json: unknown, path: JsonPath): unknown =>
  path.reduce<unknown>((value, key) => {
    if (!isJsonContainer(value)) {
      throw new Error(`No JSON value at ${path.join('.')}.`);
    }

    return value[key];
  }, json);

/**
 * Parses a fixture file and changes it for a test.
 * @param path - The file's path in the fixture folder, such as
 * `'maps/orthogonal.tmj'`.
 * @param edits - Values to set, each at a path; `undefined` deletes the
 * field.
 * @returns A fresh copy of its JSON, changed.
 */
export const editFixture = (
  path: string,
  ...edits: readonly (readonly [JsonPath, unknown])[]
): unknown => {
  const url = `${fixturesUrl}${path}`;

  if (!Object.hasOwn(fixtureFiles, url)) {
    throw new Error(`No fixture "${path}".`);
  }

  const json: unknown = JSON.parse(fixtureFiles[url]);

  for (const [editPath, value] of edits) {
    const parent = getJsonAt(json, editPath.slice(0, -1));
    const key = editPath[editPath.length - 1];

    if (!isJsonContainer(parent)) {
      throw new Error(`No JSON object at ${editPath.join('.')}.`);
    }

    if (value === undefined) {
      delete parent[key];
    } else {
      parent[key] = value;
    }
  }

  return json;
};

/**
 * Serves files through a stubbed `fetch`, by URL. A URL with no file gets
 * a 404 response.
 * @param files - Each file's text, or JSON to serve, by URL.
 * Defaults to the fixture files.
 * @returns The stubbed `fetch`.
 */
export const serveFiles = (
  files: Readonly<Record<string, unknown>> = fixtureFiles,
): ReturnType<typeof vi.fn> => {
  const fetch = vi.fn((url: string) => {
    const file = files[url];

    if (file === undefined) {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.reject(new Error('Not Found')),
      });
    }

    const text = typeof file === 'string' ? file : JSON.stringify(file);

    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(JSON.parse(text) as unknown),
    });
  });

  vi.stubGlobal('fetch', fetch);

  return fetch;
};

/** A render context whose texture cache gives textures of known sizes. */
export interface FakeTiledRenderContext {
  /** The render context, with only a `textureCache`. */
  readonly renderContext: RenderContext;

  /** The texture cache's `getOrLoad`. */
  readonly getOrLoad: ReturnType<typeof vi.fn>;
}

/**
 * Creates a render context whose texture cache gives a texture-shaped
 * object of each image's size, the same object for the same URL and
 * options.
 * @param sizes - Each image's size, by URL. Defaults to the fixture
 * images.
 * @returns The render context and its texture cache's `getOrLoad`.
 */
export const createFakeTiledRenderContext = (
  sizes: Readonly<
    Record<string, { width: number; height: number }>
  > = fixtureImageSizes,
): FakeTiledRenderContext => {
  const textures = new Map<string, Texture>();
  const getOrLoad = vi.fn(
    (url: string, options: Partial<TextureOptions> = {}): Promise<Texture> => {
      if (!Object.hasOwn(sizes, url)) {
        return Promise.reject(new Error(`Failed to load image "${url}".`));
      }

      const size = sizes[url];
      const key = `${url} ${options.filter ?? 'linear'}`;
      const texture =
        textures.get(key) ?? textureOfSize(size.width, size.height);

      textures.set(key, texture);

      return Promise.resolve(texture);
    },
  );

  return {
    renderContext: { textureCache: { getOrLoad } } as unknown as RenderContext,
    getOrLoad,
  };
};
