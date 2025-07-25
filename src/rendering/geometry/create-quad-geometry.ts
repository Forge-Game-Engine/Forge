import { Geometry } from './geometry';

export function createQuadGeometry(gl: WebGL2RenderingContext): Geometry {
  const geometry = new Geometry();

  // Vertex positions for 2 triangles (forming a quad)
  const positions = new Float32Array([
    // Triangle 1
    -0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    // Triangle 2
    -0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
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

  return geometry;
}
