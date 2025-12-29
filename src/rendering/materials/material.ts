import { Matrix3x3, Vector2, Vector3 } from '../../math/index.js';
import { assertNever } from '../../utilities/index.js';
import type { Color } from '../color.js';

export type UniformValue =
  | number
  | boolean
  | Float32Array
  | Int32Array
  | WebGLTexture
  | Vector2
  | Matrix3x3;

interface UniformSpec {
  location: WebGLUniformLocation;
  type: GLenum;
}

export class Material {
  public readonly program: WebGLProgram;

  private readonly _uniforms: Map<string, UniformSpec> = new Map();
  private readonly _uniformValues: Map<string, UniformValue> = new Map();

  constructor(
    vertexShaderSource: string,
    fragmentShaderSource: string,
    gl: WebGL2RenderingContext,
  ) {
    this.program = this._createProgram(
      gl,
      vertexShaderSource,
      fragmentShaderSource,
    );
    this._detectUniforms(gl);
  }

  /**
   * Binds the material (program, uniforms, textures).
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  public bind(gl: WebGL2RenderingContext): void {
    // TODO: reduce the cognitive complexity here with a better pattern, maybe some polymorphic dispatch or strategy pattern
    gl.useProgram(this.program);

    let textureUnit = 0;

    for (const [name, spec] of this._uniforms.entries()) {
      const value = this._uniformValues.get(name);

      if (value === undefined) {
        // TODO- do we need default values?
        // do we specify those in the shader?

        continue;
      }

      const { location } = spec;

      if (value instanceof WebGLTexture) {
        textureUnit = this._bindTexture(gl, location, value, textureUnit);

        continue;
      }

      if (typeof value === 'number') {
        this._setUniformNumber(gl, location, value);

        continue;
      }

      if (typeof value === 'boolean') {
        this._setUniformBoolean(gl, location, value);

        continue;
      }

      if (value instanceof Matrix3x3) {
        this._setUniformFloat32Array(gl, location, value.matrix);

        continue;
      }

      if (value instanceof Int32Array) {
        this._setUniformInt32Array(gl, location, value);

        continue;
      }

      if (value instanceof Float32Array) {
        this._setUniformFloat32Array(gl, location, value);

        continue;
      }

      if (value instanceof Vector2) {
        this._setUniformFloat32Array(gl, location, value.toFloat32Array());

        continue;
      }

      assertNever(value, `Unsupported uniform value type for ${name}`);
    }
  }

  /**
   * Sets a uniform value (number, vec2, matrix, texture, etc.).
   */
  public setUniform(name: string, value: UniformValue): void {
    if (!this._uniforms.has(name)) {
      throw new Error(
        `Uniform "${name}" does not exist on material. Available uniforms are: ${Array.from(this._uniforms.keys()).join(', ')}.`,
      );
    }

    this._uniformValues.set(name, value);
  }

  /**
   * Sets a color uniform as a float32 array using the color's RGBA values.
   */
  public setColorUniform(name: string, color: Color): void {
    this.setUniform(name, color.toFloat32Array());
  }

  /**
   * Sets a vector2 or Vector3 uniform as a float32 array using the vector's elements.
   */
  public setVectorUniform(name: string, vector: Vector2 | Vector3): void {
    this.setUniform(name, vector.toFloat32Array());
  }

  private _bindTexture(
    gl: WebGL2RenderingContext,
    loc: WebGLUniformLocation,
    texture: WebGLTexture,
    textureUnit: number,
  ): number {
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(loc, textureUnit);

    return textureUnit + 1;
  }

  private _setUniformNumber(
    gl: WebGL2RenderingContext,
    loc: WebGLUniformLocation,
    value: number,
  ): void {
    gl.uniform1f(loc, value);
  }

  private _setUniformBoolean(
    gl: WebGL2RenderingContext,
    loc: WebGLUniformLocation,
    value: boolean,
  ): void {
    gl.uniform1i(loc, value ? 1 : 0);
  }

  private _setUniformFloat32Array(
    gl: WebGL2RenderingContext,
    loc: WebGLUniformLocation,
    value: Float32Array,
  ): void {
    switch (value.length) {
      case 2:
        gl.uniform2fv(loc, value);

        break;
      case 3:
        gl.uniform3fv(loc, value);

        break;
      case 4:
        gl.uniform4fv(loc, value);

        break;
      case 9:
        gl.uniformMatrix3fv(loc, false, value);

        break;
      case 16:
        gl.uniformMatrix4fv(loc, false, value);

        break;
    }
  }

  private _setUniformInt32Array(
    gl: WebGL2RenderingContext,
    loc: WebGLUniformLocation,
    value: Int32Array,
  ): void {
    gl.uniform1iv(loc, value);
  }

  private _createProgram(
    gl: WebGL2RenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string,
  ): WebGLProgram {
    const vertexShader = this._compileShader(
      gl,
      vertexShaderSource,
      gl.VERTEX_SHADER,
    );
    const fragmentShader = this._compileShader(
      gl,
      fragmentShaderSource,
      gl.FRAGMENT_SHADER,
    );

    const program = gl.createProgram();
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
  ): WebGLShader {
    const shader = gl.createShader(type)!;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);

      throw new Error(`Shader compile error: ${log}`);
    }

    return shader;
  }

  private _detectUniforms(gl: WebGL2RenderingContext): void {
    const program = this.program;

    const numUniforms = gl.getProgramParameter(
      program,
      gl.ACTIVE_UNIFORMS,
    ) as number;

    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(program, i);

      if (!info) {
        continue;
      }

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
