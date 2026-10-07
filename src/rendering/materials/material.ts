import { Vec2, Vec3, Vector2, Vector3 } from '../../math/index.js';
import type { Color } from '../color.js';
import type { RenderContext } from '../render-context.js';
import type { ForgeShaderSource } from '../shaders/pre-processing/forge-shader-source.js';
import { createUniformUpload, UniformUpload } from './create-uniform-upload.js';
import type { ShaderProgram } from './shader-program.js';
import { UniformValue } from './uniform-value.js';

/**
 * A shader program plus the uniform values to draw with. Materials made
 * from the same two shaders share one linked program (see
 * `RenderContext.getShaderProgram`), so creating a material is cheap; each
 * material keeps its own uniform values, and binding it uploads them.
 *
 * A material's uniforms are the ones its shaders' sources declare, read
 * after `#pragma forge include(...)`s are resolved, from declarations of
 * the form `uniform [precision] <type> <name>[<size>], ...;` (or
 * `<type>[<size>] <name>`), with an optional `layout(...)` qualifier:
 * - An array's size is an integer literal, a `#define NAME <integer>` or a
 *   `const int NAME = <integer>;`. Any other size expression throws when
 *   the material is created.
 * - Two declarations of the same name, in one shader or across the two,
 *   must agree on type and size.
 * - `#if`/`#ifdef` blocks aren't evaluated, so a uniform declared in a
 *   branch that's compiled out can still be set, and is treated like a
 *   uniform the compiler removed.
 * - Uniform blocks (`uniform Block { ... };`) aren't supported.
 * - A struct uniform (`uniform Light u_light;`) can't be set by its own
 *   name; its members (`u_light.color`) can be set while the program uses
 *   them. The same applies to a uniform whose type is a macro
 *   (`uniform TINT_TYPE u_tint;`).
 */
export class Material {
  private readonly _shaderProgram: ShaderProgram;
  /** Pending uploads by uniform name (see `UniformDeclaration.name`). */
  private readonly _uniformUploads: Map<string, UniformUpload> = new Map();

  /**
   * Constructs a new instance of the `Material` class.
   * @param renderContext - The render context to draw with. Its program
   * cache compiles and links the two shaders the first time any material
   * uses them.
   * @param vertexShaderSource - The vertex shader source.
   * @param fragmentShaderSource - The fragment shader source.
   * @throws An error if a shader fails to compile or link, if the two
   * shaders declare the same uniform with different types or sizes, or if
   * they declare a sampler other than `sampler2D`.
   */
  constructor(
    renderContext: RenderContext,
    vertexShaderSource: ForgeShaderSource,
    fragmentShaderSource: ForgeShaderSource,
  ) {
    this._shaderProgram = renderContext.getShaderProgram(
      vertexShaderSource,
      fragmentShaderSource,
    );
  }

  /** The linked WebGL program, shared with every material made from the same shaders. */
  get program(): WebGLProgram {
    return this._shaderProgram.program;
  }

  /**
   * Binds the material: uses its program and gives every uniform the
   * program kept a value, the material's own if it set one, and otherwise a
   * default (zero for numbers, vectors and matrices, the render context's
   * `blackTexture` for samplers). Textures are bound to consecutive texture
   * units from `0`.
   * @param gl - The WebGL2 rendering context.
   * @returns The first texture unit the material left free.
   */
  public bind(gl: WebGL2RenderingContext): number {
    gl.useProgram(this.program);

    let textureUnit = 0;

    for (const uniform of this._shaderProgram.activeUniforms) {
      const upload =
        this._uniformUploads.get(uniform.name) ?? uniform.defaultUpload;

      if (upload !== null) {
        textureUnit = upload(gl, uniform.location, textureUnit);
      }
    }

    return textureUnit;
  }

  /**
   * Whether the material's shaders declare a uniform called `name`, so it
   * can be set (see {@link Material.setUniform}).
   * @param name - The uniform's name.
   * @returns `true` if the uniform can be set.
   */
  public hasUniform(name: string): boolean {
    return this._shaderProgram.uniforms.has(name);
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
   * - `sampler2D`: a `Texture`.
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
    this.storeUniform(name, value);
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

  /**
   * Checks `value` against the uniform's declaration and stores it, to be
   * uploaded on the next {@link Material.bind}. What
   * {@link Material.setUniform} does, without any restriction a subclass
   * puts on which uniforms callers may set.
   * @param name - The uniform's name.
   * @param value - The value to upload.
   * @throws An error under the same conditions as {@link Material.setUniform}.
   */
  protected storeUniform(name: string, value: UniformValue): void {
    const { uniforms, description, declaredUniformNames } = this._shaderProgram;
    const uniform = uniforms.get(name);

    if (uniform === undefined) {
      throw new Error(
        `Uniform "${name}" is not declared in ${description}. Declared uniforms: ${declaredUniformNames.join(', ') || 'none'}.`,
      );
    }

    this._uniformUploads.set(uniform.name, createUniformUpload(uniform, value));
  }
}
