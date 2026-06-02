/**
 * Creates and compiles a WebGL shader.
 *
 * @param gl - The WebGL2 rendering context.
 * @param source - The GLSL source code for the shader.
 * @param type - The type of shader (e.g., gl.VERTEX_SHADER or gl.FRAGMENT_SHADER).
 * @returns The compiled shader.
 * @throws An error if the shader creation or compilation fails.
 */
export const createShader = (
  gl: WebGL2RenderingContext,
  source: string,
  type: GLenum,
): WebGLShader => {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error('Shader creation error');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const shaderInfoLog = gl.getShaderInfoLog(shader);

    gl.deleteShader(shader);

    throw new Error(`Shader compile error: ${shaderInfoLog}`);
  }

  return shader;
};
