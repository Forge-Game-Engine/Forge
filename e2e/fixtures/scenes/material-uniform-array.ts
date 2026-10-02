import { ForgeShaderSource, Material } from '../../../src/index.js';
import { CreateScene, SceneHandle } from './scene.js';

/** How many `vec4` elements the scene's `u_waves` uniform array declares. */
const waveCount = 4;

const canvasWidth = 400;
const canvasHeight = 100;

// A single oversized triangle covering the whole viewport, generated from
// `gl_VertexID` so the scene needs no vertex buffers or attributes - the
// only data path under test is the uniform upload.
const vertexShaderSource = `#version 300 es
#pragma forge name(material-uniform-array.vert)

out vec2 v_uv;

void main() {
  vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = position;
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}
`;

// Splits the canvas into one vertical strip per array element and paints
// each strip with that element's rgb, so every element's upload is visible.
const fragmentShaderSource = `#version 300 es
#pragma forge name(material-uniform-array.frag)

precision highp float;

uniform vec4 u_waves[${waveCount}];

in vec2 v_uv;
out vec4 outColor;

void main() {
  int strip = min(int(v_uv.x * ${waveCount}.0), ${waveCount - 1});
  outColor = vec4(u_waves[strip].rgb, 1.0);
}
`;

/** The rendered color sampled from the center of one strip. */
export interface StripColor {
  r: number;
  g: number;
  b: number;
}

/**
 * The scene's handle: a full-canvas quad whose strips are colored from a
 * `uniform vec4 u_waves[4]` array set through `Material.setUniform`.
 */
export interface MaterialUniformArraySceneHandle extends SceneHandle {
  /**
   * Sets `u_waves` through `Material.setUniform`.
   * @param name - Which of the array's two accepted names to set it by.
   * @param values - The flattened `vec4` elements to upload.
   */
  setWaves(name: 'u_waves' | 'u_waves[0]', values: number[]): void;
  /**
   * Reads every `u_waves` element back from the linked program with
   * `gl.getUniform`, i.e. what the GPU actually received.
   */
  readWaves(): number[][];
  /** Returns (and clears) the context's pending `gl.getError()` code. */
  readGlError(): number;
  /**
   * Samples the center pixel of each strip from the displayed canvas.
   * Must run in the same task as `step()`, since the canvas isn't created
   * with `preserveDrawingBuffer`.
   */
  measureStripColors(): StripColor[];
}

export const createScene: CreateScene = (container) => {
  const canvas = document.createElement('canvas');

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  container.appendChild(canvas);

  const gl = canvas.getContext('webgl2');

  if (!gl) {
    throw new Error('WebGL2 context not available');
  }

  const material = new Material(
    new ForgeShaderSource(vertexShaderSource),
    new ForgeShaderSource(fragmentShaderSource),
    gl,
  );

  const handle: MaterialUniformArraySceneHandle = {
    step(): void {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      material.bind(gl);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    setWaves(name, values): void {
      material.setUniform(name, new Float32Array(values));
    },

    readWaves(): number[][] {
      const waves: number[][] = [];

      for (let index = 0; index < waveCount; index++) {
        const location = gl.getUniformLocation(
          material.program,
          `u_waves[${index}]`,
        );

        if (!location) {
          throw new Error(`u_waves[${index}] is not an active uniform`);
        }

        const value: unknown = gl.getUniform(material.program, location);

        if (!(value instanceof Float32Array)) {
          throw new Error(`u_waves[${index}] did not read back as a vec4`);
        }

        waves.push(Array.from(value));
      }

      return waves;
    },

    readGlError(): number {
      return gl.getError();
    },

    measureStripColors(): StripColor[] {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const stripWidth = canvas.width / waveCount;
      const y = Math.floor(canvas.height / 2);
      const colors: StripColor[] = [];

      for (let index = 0; index < waveCount; index++) {
        const x = Math.floor(stripWidth * (index + 0.5));
        const [r, g, b] = context2d.getImageData(x, y, 1, 1).data;

        colors.push({ r, g, b });
      }

      return colors;
    },
  };

  return handle;
};
