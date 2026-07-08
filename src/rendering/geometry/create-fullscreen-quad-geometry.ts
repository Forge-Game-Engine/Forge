import { Geometry } from './geometry.js';

const geometryCache = new WeakMap<WebGL2RenderingContext, Geometry>();

/**
 * Creates (or returns the cached) geometry for a full-screen quad in
 * normalized device coordinates, for use by passes that sample a texture
 * and draw it directly (e.g. post-processing, presenting a render target).
 * @param gl - The WebGL2 rendering context.
 * @returns The full-screen quad geometry.
 */
export function createFullscreenQuadGeometry(
  gl: WebGL2RenderingContext,
): Geometry {
  const cachedGeometry = geometryCache.get(gl);

  if (cachedGeometry) {
    return cachedGeometry;
  }

  const geometry = new Geometry();

  // Vertex positions for 2 triangles (forming a full-screen quad in NDC)
  const positions = new Float32Array([
    // Triangle 1
    -1, -1, 1, -1, -1, 1,
    // Triangle 2
    -1, 1, 1, -1, 1, 1,
  ]);

  // Default full texture coordinates
  const texCoords = new Float32Array([
    // Triangle 1
    0, 0, 1, 0, 0, 1,
    // Triangle 2
    0, 1, 1, 0, 1, 1,
  ]);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  geometry.addAttribute(gl, 'a_position', {
    buffer: positionBuffer,
    size: 2,
  });

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

  geometry.addAttribute(gl, 'a_texCoord', {
    buffer: texCoordBuffer,
    size: 2,
  });

  geometryCache.set(gl, geometry);

  return geometry;
}
