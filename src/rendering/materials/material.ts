import { Vec2, Vec3, Vector2, Vector3 } from '../../math/index.js';
import type { Color } from '../color.js';
import { ForgeShaderSource, UniformSourceDeclaration } from '../index.js';
import { addUniformDeclaration } from '../shaders/pre-processing/uniform-declarations.js';
import {
  createUniformUpload,
  UniformDeclaration,
  UniformUpload,
} from './create-uniform-upload.js';
import { getUniformType, getUniformTypeByGlslName } from './uniform-types.js';
import { UniformValue } from './uniform-value.js';

/**
 * WebGL reports a uniform array under its first element's name
 * (`u_items[0]`); stripping the suffix gives the name it's declared with.
 */
const arrayElementZeroSuffix = '[0]';

/** A uniform the linked program kept, and where to upload its value. */
interface ActiveUniformSpec extends UniformDeclaration {
  readonly location: WebGLUniformLocation;
}

export class Material {
  public readonly program: WebGLProgram;

  /** A description of the material's shaders, for error messages. */
  private readonly _description: string;
  /** The names of the uniforms its shaders declare, in declaration order. */
  private readonly _declaredUniformNames: string[] = [];
  /**
   * Every uniform that can be set, by name: the declared uniforms, whether
   * or not the compiler kept them, and the active members of struct
   * uniforms. Arrays are reachable as `u_items` and `u_items[0]`.
   */
  private readonly _uniforms: Map<string, UniformDeclaration> = new Map();
  /** Active uniforms in program order, each listed once. */
  private readonly _activeUniforms: ActiveUniformSpec[] = [];
  /** Pending uploads by uniform name (see `UniformDeclaration.name`). */
  private readonly _uniformUploads: Map<string, UniformUpload> = new Map();

  /**
   * Constructs a new instance of the `Material` class.
   * @param vertexShaderSource - The vertex shader source.
   * @param fragmentShaderSource - The fragment shader source.
   * @param gl - The WebGL2 rendering context.
   * @throws An error if a shader fails to compile or link, or if the two
   * shaders declare the same uniform with different types or sizes.
   */
  constructor(
    vertexShaderSource: ForgeShaderSource,
    fragmentShaderSource: ForgeShaderSource,
    gl: WebGL2RenderingContext,
  ) {
    this._description = `material "${vertexShaderSource.name}" + "${fragmentShaderSource.name}"`;
    this.program = this._createProgram(
      gl,
      vertexShaderSource.preparedSource,
      fragmentShaderSource.preparedSource,
    );
    this._addDeclaredUniforms(vertexShaderSource, fragmentShaderSource);
    this._addActiveUniforms(gl);
  }

  /**
   * Binds the material: uses its program, uploads every uniform that has a
   * value, and binds its textures to consecutive texture units.
   * @param gl - The WebGL2 rendering context.
   */
  public bind(gl: WebGL2RenderingContext): void {
    gl.useProgram(this.program);

    let textureUnit = 0;

    for (const spec of this._activeUniforms) {
      const upload = this._uniformUploads.get(spec.name);

      if (upload === undefined) {
        // TODO: improvement - evaluate whether uniform defaults should be provided.
        // If needed, defaults may be defined by shader conventions.

        continue;
      }

      textureUnit = upload(gl, spec.location, textureUnit);
    }
  }

  /**
   * Sets a uniform's value, uploaded on the next {@link Material.bind}.
   *
   * The GL upload is chosen from the uniform's declared GLSL type, and the
   * value must fit that type:
   * - `float`, `vecN`, `matN`, `matNxM`: a `Float32Array` (a `number` for
   *   `float`, a `Vector2` for `vec2`, a `Matrix3x3` for `mat3`).
   * - `int`, `ivecN`: an `Int32Array` (a `number` or `boolean` for `int`).
   * - `uint`, `uvecN`: a `Uint32Array` (a `number` for `uint`).
   * - `bool`, `bvecN`: an `Int32Array` (a `boolean` for `bool`).
   * - samplers: a `WebGLTexture`.
   *
   * A typed array must hold exactly one element's worth of components (4 for
   * a `vec4`, 16 for a `mat4`), or, for a uniform array, a whole number of
   * elements up to the declared size; a shorter array updates only the
   * leading elements. A uniform array can be addressed by its declared name
   * (`u_items`) or by the name WebGL reports for it (`u_items[0]`).
   *
   * Any uniform the material's shaders declare can be set, including one
   * the GLSL compiler removed because nothing reads it: its value is checked
   * and stored the same way, and there's nothing to upload. Members of a
   * struct uniform (`u_light.color`) can be set while the program keeps
   * them.
   * @param name - The uniform's name.
   * @param value - The value to upload.
   * @throws An error if the shaders don't declare a uniform called `name`,
   * or if `value` doesn't fit the uniform's declared type.
   */
  public setUniform(name: string, value: UniformValue): void {
    const uniform = this._uniforms.get(name);

    if (uniform === undefined) {
      throw new Error(
        `Uniform "${name}" is not declared in ${this._description}. Declared uniforms: ${this._declaredUniformNames.join(', ') || 'none'}.`,
      );
    }

    this._uniformUploads.set(uniform.name, createUniformUpload(uniform, value));
  }

  /**
   * Sets a `vec4` uniform from the color's RGBA values.
   * @param name - The uniform's name.
   * @param color - The color to upload.
   * @throws An error under the same conditions as {@link Material.setUniform}.
   */
  public setColorUniform(name: string, color: Color): void {
    this.setUniform(name, color.toFloat32Array());
  }

  /**
   * Sets a `vec2` or `vec3` uniform from the vector's elements.
   * @param name - The uniform's name.
   * @param vector - The vector to upload.
   * @throws An error under the same conditions as {@link Material.setUniform}.
   */
  public setVectorUniform(name: string, vector: Vector2 | Vector3): void {
    this.setUniform(
      name,
      'z' in vector ? Vec3.toFloat32Array(vector) : Vec2.toFloat32Array(vector),
    );
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
    gl.compileShader(shader); // TODO: Add shader cache for compiled shaders.

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);

      throw new Error(`Shader compile error: ${log}`);
    }

    return shader;
  }

  /**
   * Registers every uniform the two shaders declare, with the type and size
   * from its declaration. A struct-typed uniform isn't settable by its own
   * name; its active members are added by `_addActiveUniforms`.
   */
  private _addDeclaredUniforms(
    vertexShaderSource: ForgeShaderSource,
    fragmentShaderSource: ForgeShaderSource,
  ): void {
    const declarations = new Map<string, UniformSourceDeclaration>();

    for (const source of [vertexShaderSource, fragmentShaderSource]) {
      for (const declaration of source.uniformDeclarations.values()) {
        addUniformDeclaration(declarations, declaration, this._description);
      }
    }

    for (const declaration of declarations.values()) {
      const glslType = getUniformTypeByGlslName(declaration.glslTypeName);

      if (glslType === null) {
        continue;
      }

      const { name } = declaration;
      const uniform: UniformDeclaration = {
        name,
        glType: glslType.glType,
        uniformType: glslType.uniformType,
        size: declaration.size,
      };

      this._declaredUniformNames.push(name);
      this._uniforms.set(name, uniform);

      if (declaration.isArray) {
        this._uniforms.set(`${name}${arrayElementZeroSuffix}`, uniform);
      }
    }
  }

  /**
   * Records where to upload each uniform the linked program kept, in
   * program order. A declared uniform keeps its declared type and size;
   * anything else the program reports (members of a struct uniform) is
   * typed from what `getActiveUniform` reports.
   */
  private _addActiveUniforms(gl: WebGL2RenderingContext): void {
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

      if (location === null) {
        continue;
      }

      const name = info.name.endsWith(arrayElementZeroSuffix)
        ? info.name.slice(0, -arrayElementZeroSuffix.length)
        : info.name;

      const uniform = this._uniforms.get(name) ?? {
        name,
        glType: info.type,
        uniformType: getUniformType(info.type),
        size: info.size,
      };

      this._uniforms.set(name, uniform);
      this._uniforms.set(info.name, uniform);
      this._activeUniforms.push({ ...uniform, location });
    }
  }
}
