import { Geometry } from './geometry.js';

export interface QuadGeometryOptions {
  /**
   * The distance from the quad's center to each edge, on both axes (so the
   * quad spans `extents * 2` units along each axis). `0.5` (the default)
   * produces a unit quad centered at the origin, for sprites scaled by a
   * transform matrix. `1` produces a quad that spans the full `[-1, 1]`
   * clip-space range on its own, for full-screen passes.
   */
  extents?: number;
}

const defaultQuadGeometryOptions = { extents: 0.5 };

const geometryCache = new WeakMap<
  WebGL2RenderingContext,
  Map<number, Geometry>
>();

/**
 * Creates (or returns the cached) geometry for a quad, cached per WebGL
 * context and `extents` value.
 * @param gl - The WebGL2 rendering context.
 * @param options - Options for configuring the quad's size.
 * @returns The quad geometry.
 */
export function createQuadGeometry(
  gl: WebGL2RenderingContext,
  options: QuadGeometryOptions = {},
): Geometry {
  const { extents } = { ...defaultQuadGeometryOptions, ...options };

  let geometriesByExtents = geometryCache.get(gl);

  if (!geometriesByExtents) {
    geometriesByExtents = new Map();
    geometryCache.set(gl, geometriesByExtents);
  }

  const cachedGeometry = geometriesByExtents.get(extents);

  if (cachedGeometry) {
    return cachedGeometry;
  }

  const geometry = new Geometry();

  // Vertex positions for 2 triangles (forming a quad)
  const positions = new Float32Array([
    // Triangle 1
    -extents,
    -extents,
    extents,
    -extents,
    -extents,
    extents,
    // Triangle 2
    -extents,
    extents,
    extents,
    -extents,
    extents,
    extents,
  ]);

  // Default full texture coordinates
  const texCoords = new Float32Array([
    // Triangle 1
    0, 0, 1, 0, 0, 1,
    // Triangle 2
    0, 1, 1, 0, 1, 1,
  ]);

  // Create position buffer
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  geometry.addAttribute(gl, 'a_position', {
    buffer: positionBuffer,
    size: 2,
  });

  // Create texCoord buffer
  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

  geometry.addAttribute(gl, 'a_texCoord', {
    buffer: texCoordBuffer,
    size: 2,
  });

  geometriesByExtents.set(extents, geometry);

  return geometry;
}
