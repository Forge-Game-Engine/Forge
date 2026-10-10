import type { RenderContext } from '../../../src/rendering/index.js';

/** A color read back from the canvas, as bytes. */
export type Rgba = readonly [number, number, number, number];

/**
 * A vertex shader that covers its viewport with one triangle made from
 * `gl_VertexID`, so a draw of 3 vertices needs no vertex buffer.
 */
export const fullscreenTriangleVertexShader = `#version 300 es
out vec2 v_uv;
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = corner;
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

/** Reads the canvas's pixels back, with rows from the top. */
export interface CanvasPixels {
  readonly width: number;
  readonly height: number;

  /**
   * The color at a pixel.
   * @param x - Pixels from the left.
   * @param y - Pixels from the top.
   */
  at(x: number, y: number): Rgba;
}

/**
 * Reads the canvas's drawing buffer, which needs `preserveDrawingBuffer` (or
 * the read to happen in the same task as the draw). Uses WebGL directly, so
 * the device's state is reset afterwards.
 * @param renderContext - The render context.
 * @returns The pixels.
 */
export function readCanvas(renderContext: RenderContext): CanvasPixels {
  const { gl, width, height } = renderContext;
  const pixels = new Uint8Array(width * height * 4);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  renderContext.device.resetState();

  return {
    width,
    height,
    at(x: number, y: number): Rgba {
      const offset = ((height - 1 - y) * width + x) * 4;

      return [
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
        pixels[offset + 3],
      ];
    },
  };
}
