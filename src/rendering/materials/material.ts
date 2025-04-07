import type { Vector3 } from '../../math';
import { resolveIncludes } from '../shaders';

type UniformValue = number | boolean | Float32Array | Int32Array | WebGLTexture;

interface UniformSpec {
  location: WebGLUniformLocation;
  type: GLenum;
}

export class Material {
  public readonly program: WebGLProgram;

  private _uniforms: Map<string, UniformSpec> = new Map();
  private _uniformValues: Map<string, UniformValue> = new Map();

  constructor(
    gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string,
    includesMap: Record<string, string> = {},
  ) {
    this.program = this._createProgram(
      gl,
      vertexSource,
      fragmentSource,
      includesMap,
    );
    this._detectUniforms(gl);
  }

  /**
   * Binds the material (program, uniforms, textures).
   */
  public bind(gl: WebGL2RenderingContext): void {
    this.beforeBind();

    gl.useProgram(this.program);

    let textureUnit = 0;

    for (const [name, spec] of this._uniforms.entries()) {
      const value = this._uniformValues.get(name);
      if (value === undefined) continue;

      const loc = spec.location;

      if (value instanceof WebGLTexture) {
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, value);
        gl.uniform1i(loc, textureUnit);
        textureUnit++;
      } else if (typeof value === 'number') {
        gl.uniform1f(loc, value);
      } else if (typeof value === 'boolean') {
        gl.uniform1i(loc, value ? 1 : 0);
      } else if (value instanceof Float32Array) {
        if (value.length === 2) gl.uniform2fv(loc, value);
        else if (value.length === 3) gl.uniform3fv(loc, value);
        else if (value.length === 4) gl.uniform4fv(loc, value);
        else if (value.length === 9) gl.uniformMatrix3fv(loc, false, value);
        else if (value.length === 16) gl.uniformMatrix4fv(loc, false, value);
      } else if (value instanceof Int32Array) {
        gl.uniform1iv(loc, value);
      }
    }
  }

  /**
   * Sets a uniform value (number, vec2, matrix, texture, etc.).
   */
  protected setUniform(name: string, value: UniformValue): void {
    this._uniformValues.set(name, value);
  }

  protected beforeBind(): void {
    // Override in subclasses for custom behavior before binding
  }

  /**
   * Converts a vector3 to a float32 array.
   */
  protected convertToFloat32Array(vector: Vector3): Float32Array {
    return new Float32Array([vector.x / 255, vector.y / 255, vector.z / 255]);
  }

  private _createProgram(
    gl: WebGL2RenderingContext,
    vertexSrc: string,
    fragmentSrc: string,
    includesMap: Record<string, string>,
  ): WebGLProgram {
    const vertexShader = this._compileShader(
      gl,
      vertexSrc,
      gl.VERTEX_SHADER,
      includesMap,
    );
    const fragmentShader = this._compileShader(
      gl,
      fragmentSrc,
      gl.FRAGMENT_SHADER,
      includesMap,
    );

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      throw new Error(`Failed to link program: ${log}`);
    }

    return program;
  }

  private _compileShader(
    gl: WebGL2RenderingContext,
    source: string,
    type: GLenum,
    includesMap: Record<string, string>,
  ): WebGLShader {
    const shader = gl.createShader(type)!;

    const sourceWithIncludes = resolveIncludes(source, includesMap);

    gl.shaderSource(shader, sourceWithIncludes);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      throw new Error(`Shader compile error: ${log}`);
    }

    return shader;
  }

  private _detectUniforms(gl: WebGL2RenderingContext): void {
    const program = this.program;

    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(program, i);
      if (!info) continue;

      const location = gl.getUniformLocation(program, info.name);
      if (location !== null) {
        this._uniforms.set(info.name, {
          location,
          type: info.type,
        });
      }
    }
  }
}
