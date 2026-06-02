import { createShader } from './compile-shader.js';

/**
 * Creates and links a WebGL shader program.
 *
 * @param gl - The WebGL2 rendering context.
 * @param vertexSource - The GLSL source code for the vertex shader.
 * @param fragmentSource - The GLSL source code for the fragment shader.
 * @returns The linked shader program.
 * @throws An error if the shader program creation or linking fails.
 */
export const createProgram = (
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram => {
  const vertexShader = createShader(gl, vertexSource, gl.VERTEX_SHADER);
  const fragmentShader = createShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

  const program = gl.createProgram();

  if (!program) {
    throw new Error('Program creation error');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const programInfoLog = gl.getProgramInfoLog(program);

    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    throw new Error(`Program link error: ${programInfoLog}`);
  }

  return program;
};
