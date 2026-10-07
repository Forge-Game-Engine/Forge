import {
  createRenderContext,
  ForgeShaderSource,
  Material,
} from '../../../src/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const canvasWidth = 100;
const canvasHeight = 100;

// A single oversized triangle covering the whole viewport, generated from
// `gl_VertexID` so the scene needs no vertex buffers or attributes.
const vertexShaderSource = `#version 300 es
#pragma forge name(material-unused-uniform.vert)

void main() {
  vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}
`;

// Declares `u_unused` but never reads it, so the GLSL compiler strips it
// from the linked program, the way a driver strips a uniform whose only
// reader it proved dead.
const fragmentShaderSource = `#version 300 es
#pragma forge name(material-unused-uniform.frag)

precision highp float;

uniform vec4 u_color;
uniform float u_unused;

out vec4 outColor;

void main() {
  outColor = u_color;
}
`;

/** The rendered color sampled from the center of the canvas. */
export interface CenterColor {
  r: number;
  g: number;
  b: number;
}

/**
 * The scene's handle: a full-canvas quad filled with `u_color`, drawn by a
 * material whose fragment shader also declares an unread `u_unused`.
 */
export interface MaterialUnusedUniformSceneHandle extends SceneHandle {
  /** Whether the linked program has a location for `u_unused`. */
  hasUnusedUniformLocation(): boolean;
  /**
   * Sets a uniform through `Material.setUniform`, returning the thrown
   * error's message, or `null` if it didn't throw.
   */
  trySetUniform(name: string, value: number | number[]): string | null;
  /**
   * Samples the center pixel of the displayed canvas. Must run in the same
   * task as `step()`, since the canvas isn't created with
   * `preserveDrawingBuffer`.
   */
  measureCenterColor(): CenterColor;
}

export const createScene: CreateScene = (container) => {
  const canvas = document.createElement('canvas');

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  container.appendChild(canvas);

  const renderContext = createRenderContext(canvas);
  const { gl } = renderContext;

  const material = new Material(
    renderContext,
    new ForgeShaderSource(vertexShaderSource),
    new ForgeShaderSource(fragmentShaderSource),
  );

  const handle: MaterialUnusedUniformSceneHandle = {
    step(): void {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      material.bind(gl);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    hasUnusedUniformLocation(): boolean {
      return gl.getUniformLocation(material.program, 'u_unused') !== null;
    },

    trySetUniform(name, value): string | null {
      try {
        material.setUniform(
          name,
          typeof value === 'number' ? value : new Float32Array(value),
        );

        return null;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    },

    measureCenterColor(): CenterColor {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const [r, g, b] = context2d.getImageData(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1,
      ).data;

      return { r, g, b };
    },
  };

  return handle;
};
