import {
  createIsometricGridLayout,
  createOrthogonalGridLayout,
  type GridLayout,
} from '../../math/index.js';
import type { RenderContext } from '../../rendering/render-context.js';
import type { TextureAtlas } from '../../rendering/texture-atlas/index.js';
import type { TextureFilter } from '../../rendering/texture.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { createTileSet, type TileSet } from '../tile-set/tile-set.js';
import { createTiledGidConverter } from './conversion/convert-gid.js';
import {
  convertTiledLayers,
  findTemplateUrls,
  type LoadedTiledTemplate,
} from './conversion/convert-layers.js';
import {
  parseTiledColor,
  toTiledProperties,
} from './conversion/convert-properties.js';
import {
  createTiledTileSetAtlas,
  type LoadedTiledTileSet,
  toTiledTileSetInfo,
  toTileSetSourceOptions,
} from './conversion/convert-tile-set.js';
import { worldUnitsPerTiledPixel } from './conversion/units.js';
import type {
  TiledMapFile,
  TiledTemplateFile,
  TiledTileSetFile,
  TiledTileSetReferenceFile,
} from './file-data/tiled-file-data.js';
import {
  validateTiledMapFile,
  validateTiledTemplateFile,
} from './file-data/validate-tiled-map.js';
import { validateTiledTileSetFile } from './file-data/validate-tiled-tile-set.js';
import type { TiledMap } from './tiled-map.js';

/**
 * Options for {@link TiledMapCache.getOrLoad}.
 */
export interface TiledMapLoadOptions {
  /**
   * How every tileset image of the map is filtered. Defaults to
   * `'nearest'`, since Tiled tilesets are usually pixel art; use
   * `'linear'` for smooth, high-resolution art.
   */
  filter?: TextureFilter;
}

const defaultTiledMapLoadOptions: Required<TiledMapLoadOptions> = {
  filter: 'nearest',
};

interface TiledMapLoad {
  readonly filter: TextureFilter;
  readonly promise: Promise<TiledMap>;
}

/**
 * Loads and caches Tiled maps saved as JSON (`.tmj`), with the external
 * tilesets (`.tsj`), object templates (`.tj`) and tileset images they use,
 * keyed by the map's URL. Paths in a file are resolved against that file's
 * URL, the way Tiled saves them, so a map and the files it uses must be
 * served as static files with their folders as they are in the project
 * (Vite's `public/` folder, Docusaurus's `static/`): a bundler's renamed,
 * content-hashed copies can't be found from the map.
 *
 * External tilesets and templates are fetched once, however many maps use
 * them. Tileset images load through the render context's `textureCache`,
 * which owns them, so a sprite drawn from the same image shares its
 * texture. The cache holds only CPU-side data, so it has nothing to dispose
 * or rebuild after a context loss.
 *
 * Turn a loaded map into entities with `spawnTiledMap`.
 */
export class TiledMapCache {
  private readonly _renderContext: RenderContext;
  private readonly _loads = new Map<string, TiledMapLoad>();
  private readonly _maps = new Map<string, TiledMap>();
  private readonly _tileSetFiles = new Map<string, Promise<TiledTileSetFile>>();
  private readonly _atlases = new Map<string, Promise<TextureAtlas>>();
  private readonly _templates = new Map<string, Promise<TiledTemplateFile>>();

  /**
   * Constructs a new instance of the `TiledMapCache` class.
   * @param renderContext - The render context the tileset textures are
   * created in. They load through its `textureCache`.
   */
  constructor(renderContext: RenderContext) {
    this._renderContext = renderContext;
  }

  /**
   * Retrieves a loaded map from the cache.
   * @param url - The map's URL, resolved against the page's URL like
   * `getOrLoad` resolves it.
   * @returns The cached map.
   * @throws An error if the map hasn't finished loading.
   */
  public get(url: string): TiledMap {
    const resolvedUrl = resolveAgainstPage(url);
    const map = this._maps.get(resolvedUrl);

    if (!map) {
      throw new Error(`Tiled map "${resolvedUrl}" not found in the cache.`);
    }

    return map;
  }

  /**
   * Retrieves a map from the cache, loading it, its external tilesets, its
   * templates and its tileset images the first time it's requested.
   * Concurrent calls for the same map share one load, and a failed load is
   * tried again by the next call.
   *
   * Orthogonal and isometric maps load, finite or infinite, with tile layer
   * data in CSV or base64, uncompressed or compressed with zlib or gzip.
   * @param url - The map's URL, resolved against the page's URL. The map is
   * cached under the resolved URL.
   * @param options - How the tileset textures are sampled.
   * @returns A promise that resolves to the map.
   * @throws The promise rejects if `url` was already requested with a
   * different filter, a file fails to fetch, or a file is invalid or uses a
   * Tiled feature that isn't supported (the message names the file and the
   * field): a staggered or hexagonal map, an image collection tileset,
   * `zstd` compression, a tileset's `transparentcolor` or
   * `preserve-aspect-fit` fill mode, a gid with the hexagonal rotation bit,
   * or a tile collision object that isn't one rectangle or convex polygon
   * covering part of the tile's cell.
   */
  public async getOrLoad(
    url: string,
    options: TiledMapLoadOptions = {},
  ): Promise<TiledMap> {
    const { filter } = withDefaults(defaultTiledMapLoadOptions, options);
    const mapUrl = resolveAgainstPage(url);
    const existingLoad = this._loads.get(mapUrl);

    if (existingLoad) {
      if (existingLoad.filter !== filter) {
        throw new Error(
          `Tiled map "${mapUrl}" was already requested with filter "${existingLoad.filter}", so it can't also be loaded with filter "${filter}".`,
        );
      }

      return existingLoad.promise;
    }

    const promise = this._load(mapUrl, filter);

    this._loads.set(mapUrl, { filter, promise });

    try {
      return await promise;
    } catch (error) {
      if (this._loads.get(mapUrl)?.promise === promise) {
        this._loads.delete(mapUrl);
      }

      throw error;
    }
  }

  private async _load(
    mapUrl: string,
    filter: TextureFilter,
  ): Promise<TiledMap> {
    try {
      const map = await this._convertMap(
        validateTiledMapFile(await fetchJson(mapUrl), mapUrl),
        mapUrl,
        filter,
      );

      this._maps.set(mapUrl, map);

      return map;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Unable to load Tiled map "${mapUrl}": ${message}`, {
        cause: error,
      });
    }
  }

  private async _convertMap(
    file: TiledMapFile,
    mapUrl: string,
    filter: TextureFilter,
  ): Promise<TiledMap> {
    const layout = createMapLayout(file);
    const references = [...file.tileSets].sort(
      (a, b) => a.firstGid - b.firstGid,
    );
    const [tileSets, templates] = await Promise.all([
      Promise.all(
        references.map((reference) =>
          this._loadTileSet(reference, mapUrl, filter),
        ),
      ),
      this._loadTemplates(findTemplateUrls(file.layers, mapUrl)),
    ]);
    const tileSet = createMapTileSet(tileSets, file, layout);
    const convertGid = createTiledGidConverter(
      references.map(({ firstGid }, index) => ({
        firstGid,
        tileCount: tileSets[index].file.tileCount,
      })),
    );
    const layers = await convertTiledLayers(
      file.layers,
      '',
      { x: 0, y: 0 },
      {
        mapUrl,
        tileSet,
        convertGid,
        objects: {
          orientation: file.orientation,
          layout,
          tileHeight: file.tileHeight,
          convertGid,
          objectAlignments: tileSets.map(({ file }) => file.objectAlignment),
        },
        tileSetSources: tileSets.map(({ url }, index) => ({
          url,
          firstGid: references[index].firstGid,
        })),
        templates,
      },
    );

    return Object.freeze({
      url: mapUrl,
      orientation: file.orientation,
      tileSet,
      tileSets: Object.freeze(
        tileSets.map((loaded, index) =>
          toTiledTileSetInfo(loaded, references[index].firstGid),
        ),
      ),
      size: file.infinite
        ? null
        : Object.freeze({ columns: file.width, rows: file.height }),
      backgroundColor: parseTiledColor(file.backgroundColor ?? ''),
      properties: toTiledProperties(file.properties, mapUrl),
      layers,
    });
  }

  private async _loadTileSet(
    reference: TiledTileSetReferenceFile,
    mapUrl: string,
    filter: TextureFilter,
  ): Promise<LoadedTiledTileSet> {
    if (reference.source === null) {
      const file = reference.tileSet;
      const texture = await this._renderContext.textureCache.getOrLoad(
        new URL(file.image, mapUrl).href,
        { filter },
      );

      return {
        file,
        atlas: createTiledTileSetAtlas(texture, file),
        baseUrl: mapUrl,
        url: null,
      };
    }

    const url = new URL(reference.source, mapUrl).href;
    const file = await loadShared(this._tileSetFiles, url, async () =>
      validateTiledTileSetFile(await fetchJson(url), url),
    );
    const atlas = await loadShared(
      this._atlases,
      `${filter} ${url}`,
      async () =>
        createTiledTileSetAtlas(
          await this._renderContext.textureCache.getOrLoad(
            new URL(file.image, url).href,
            { filter },
          ),
          file,
        ),
    );

    return { file, atlas, baseUrl: url, url };
  }

  private async _loadTemplates(
    urls: ReadonlySet<string>,
  ): Promise<Map<string, LoadedTiledTemplate>> {
    const templates = await Promise.all(
      [...urls].map(async (url) => ({
        url,
        file: await loadShared(this._templates, url, async () =>
          validateTiledTemplateFile(await fetchJson(url), url),
        ),
      })),
    );

    return new Map(templates.map((template) => [template.url, template]));
  }
}

/**
 * Shares one load of a file between every map that uses it, and forgets a
 * failed load so the next map tries again.
 */
async function loadShared<T>(
  loads: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const existing = loads.get(key);

  if (existing) {
    return existing;
  }

  const promise = load();

  loads.set(key, promise);

  try {
    return await promise;
  } catch (error) {
    if (loads.get(key) === promise) {
      loads.delete(key);
    }

    throw error;
  }
}

/**
 * Resolves a URL against the page's, so relative and absolute paths name
 * the same cache entry.
 */
function resolveAgainstPage(url: string): string {
  return new URL(url, document.baseURI).href;
}

/**
 * Lays out the map's cells by its orientation, with its tile size as the
 * cell size.
 */
function createMapLayout(file: TiledMapFile): GridLayout {
  const options = {
    cellWidth: file.tileWidth * worldUnitsPerTiledPixel,
    cellHeight: file.tileHeight * worldUnitsPerTiledPixel,
  };

  return file.orientation === 'isometric'
    ? createIsometricGridLayout(options)
    : createOrthogonalGridLayout(options);
}

/**
 * Builds the map's tile set, one source per tileset, and names the Tiled
 * tileset in any error the tile set raises about a source.
 */
function createMapTileSet(
  tileSets: readonly LoadedTiledTileSet[],
  file: TiledMapFile,
  layout: GridLayout,
): TileSet {
  const context = {
    layout,
    orientation: file.orientation,
    tileWidth: file.tileWidth,
    tileHeight: file.tileHeight,
  };
  const sources = tileSets.map((tileSet) =>
    toTileSetSourceOptions(tileSet, context),
  );

  try {
    return createTileSet({ layout, sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      message.replace(
        /source (\d+)/g,
        (_, index: string) => tileSets[Number(index)].file.describe,
      ),
      { cause: error },
    );
  }
}

/**
 * Fetches the JSON at `url`.
 */
async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `failed to fetch "${url}": ${response.status} ${response.statusText}`,
    );
  }

  try {
    const json: unknown = await response.json();

    return json;
  } catch (error) {
    throw new Error(`"${url}" isn't valid JSON.`, { cause: error });
  }
}
