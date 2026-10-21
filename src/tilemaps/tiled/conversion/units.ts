// How Tiled's pixels become world units. Not exported from the package.

/**
 * World units per Tiled pixel. A cell is the map's `tilewidth` by
 * `tileheight` world units, so a loaded map measures what it measures in
 * Tiled. Every pixel value the loader reads (cell and tile sizes, offsets,
 * object positions and sizes) is multiplied by it, so it's the one place
 * that decides the map's scale.
 */
export const worldUnitsPerTiledPixel = 1;
