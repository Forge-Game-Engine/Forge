import type { Vector2, Vector3 } from '../../math';
import type { Color } from '../color';
import type { ShaderStore } from '../shaders';

type UniformValue = number | boolean | Float32Array | Int32Array | WebGLTexture;

interface UniformSpec {
  location: WebGLUniformLocation;
  type: GLenum;
}

export class Material {
  public readonly program: WebGLProgram;

  private readonly _uniforms: Map<string, UniformSpec> = new Map();
  private readonly _uniformValues: Map<string, UniformValue> = new Map();

  constructor(
    vertexSourceName: string,
    fragmentSourceName: string,
    shaderStore: ShaderStore,
    gl: WebGL2RenderingContext,
  ) {
    const vertexSource = shaderStore.getShader(vertexSourceName);
    const fragmentSource = shaderStore.getShader(fragmentSourceName);

    this.program = this._createProgram(gl, vertexSource, fragmentSource);
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

      if (value === undefined) {
        continue;
      }

      const loc = spec.location;

      if (value instanceof WebGLTexture) {
        textureUnit = this._bindTexture(gl, loc, value, textureUnit);
      } else if (typeof value === 'number') {
        this._setUniformNumber(gl, loc, value);
      } else if (typeof value === 'boolean') {
        this._setUniformBoolean(gl, loc, value);
      } else if (value instanceof Float32Array) {
        this._setUniformFloat32Array(gl, loc, value);
      } else if (value instanceof Int32Array) {
        this._setUniformInt32Array(gl, loc, value);
      }
    }
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

  /**
   * Sets a uniform value (number, vec2, matrix, texture, etc.).
   */
  public setUniform(name: string, value: UniformValue): void {
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
  ): WebGLProgram {
    const vertexShader = this._compileShader(gl, vertexSrc, gl.VERTEX_SHADER);
    const fragmentShader = this._compileShader(
      gl,
      fragmentSrc,
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

    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

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
