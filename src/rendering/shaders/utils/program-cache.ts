import { createProgram } from './create-shader-program.js';
import { hashString } from './hash-string.js';

/**
 * Compiles and links WebGL shader programs, reusing a previously compiled
 * program when asked for the same vertex/fragment shader source pair.
 * Avoids redundant shader compilation when multiple materials share
 * identical shader source (e.g. several post-process passes reusing the
 * same passthrough shader).
 *
 * Each `RenderContext` owns its own `ProgramCache` (`RenderContext.programCache`);
 * there is no shared global cache, so programs compiled for one WebGL
 * context are never reused for another.
 */
export class ProgramCache {
  private readonly _programsByKey: Map<string, WebGLProgram> = new Map();

  /**
   * Returns the cached program for the given shader source pair, compiling
   * and caching a new one the first time it's requested.
   * @param gl - The WebGL2 rendering context.
   * @param vertexSource - The GLSL source code for the vertex shader.
   * @param fragmentSource - The GLSL source code for the fragment shader.
   * @returns The linked shader program.
   * @throws An error if the shader program creation or linking fails.
   */
  public getProgram(
    gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string,
  ): WebGLProgram {
    const key = `${hashString(vertexSource)}:${hashString(fragmentSource)}`;
    const cachedProgram = this._programsByKey.get(key);

    if (cachedProgram) {
      return cachedProgram;
    }

    const program = createProgram(gl, vertexSource, fragmentSource);

    this._programsByKey.set(key, program);

    return program;
  }
}
