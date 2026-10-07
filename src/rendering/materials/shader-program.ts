import type { ForgeShaderSource } from '../shaders/pre-processing/forge-shader-source.js';
import {
  addUniformDeclaration,
  UniformSourceDeclaration,
} from '../shaders/pre-processing/uniform-declarations.js';
import type { Texture } from '../texture.js';
import {
  createDefaultUniformUpload,
  UniformDeclaration,
  UniformUpload,
} from './create-uniform-upload.js';
import { getUniformType, getUniformTypeByGlslName } from './uniform-types.js';

/**
 * WebGL reports a uniform array under its first element's name
 * (`u_items[0]`); stripping the suffix gives the name it's declared with.
 */
const arrayElementZeroSuffix = '[0]';

/** The only sampler type a `Texture` can be bound to. */
const supportedSamplerGlslName = 'sampler2D';

/**
 * A uniform the linked program kept: where to upload its value, and what to
 * upload when a material hasn't set one.
 */
export interface ActiveUniform extends UniformDeclaration {
  readonly location: WebGLUniformLocation;
  readonly defaultUpload: UniformUpload | null;
}

/**
 * A linked vertex + fragment shader pair and its uniform table: the
 * uniforms its shaders declare, and where the program keeps the active
 * ones. Shared by every `Material` made from the same two shaders, and
 * cached by the render context (see `RenderContext.getShaderProgram`), so
 * each shader pair compiles and links once.
 */
export class ShaderProgram {
  /** The linked WebGL program. */
  public readonly program: WebGLProgram;

  /** A description of the program's shaders, for error messages. */
  public readonly description: string;

  /** The names of the uniforms its shaders declare, in declaration order. */
  public readonly declaredUniformNames: readonly string[];

  /**
   * Every uniform that can be set, by name: the declared uniforms, whether
   * or not the compiler kept them, and the active members of struct
   * uniforms. Arrays are reachable as `u_items` and `u_items[0]`.
   */
  public readonly uniforms: ReadonlyMap<string, UniformDeclaration>;

  /** Active uniforms in program order, each listed once. */
  public readonly activeUniforms: readonly ActiveUniform[];

  /**
   * Compiles and links the two shaders and reads their uniforms.
   * @param gl - The WebGL2 rendering context.
   * @param vertexShaderSource - The vertex shader source.
   * @param fragmentShaderSource - The fragment shader source.
   * @param blackTexture - Returns the texture an unset sampler samples.
   * @throws An error if a shader fails to compile or link, if the two
   * shaders declare the same uniform with different types or sizes, or if
   * they declare a sampler other than `sampler2D`.
   */
  constructor(
    gl: WebGL2RenderingContext,
    vertexShaderSource: ForgeShaderSource,
    fragmentShaderSource: ForgeShaderSource,
    blackTexture: () => Texture,
  ) {
    this.description = `material "${vertexShaderSource.name}" + "${fragmentShaderSource.name}"`;

    const uniforms = new Map<string, UniformDeclaration>();
    const declaredUniformNames = this._addDeclaredUniforms(
      uniforms,
      vertexShaderSource,
      fragmentShaderSource,
    );

    this.program = this._createProgram(
      gl,
      vertexShaderSource.preparedSource,
      fragmentShaderSource.preparedSource,
    );
    this.declaredUniformNames = declaredUniformNames;
    this.activeUniforms = this._addActiveUniforms(gl, uniforms, blackTexture);
    this.uniforms = uniforms;
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

    // A linked program keeps its own copy of the compiled code.
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);

      gl.deleteProgram(program);

      throw new Error(`Failed to link ${this.description}: ${log}`);
    }

    return program;
  }

  private _compileShader(
    gl: WebGL2RenderingContext,
    source: string,
    type: GLenum,
  ): WebGLShader {
    const shader = gl.createShader(type);

    if (!shader) {
      throw new Error(`Failed to create a shader for ${this.description}.`);
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);

      gl.deleteShader(shader);

      throw new Error(`Shader compile error in ${this.description}: ${log}`);
    }

    return shader;
  }

  /**
   * Registers every uniform the two shaders declare, with the type and size
   * from its declaration. A struct-typed uniform isn't settable by its own
   * name; its active members are added by `_addActiveUniforms`.
   * @returns The declared uniforms' names, in declaration order.
   */
  private _addDeclaredUniforms(
    uniforms: Map<string, UniformDeclaration>,
    vertexShaderSource: ForgeShaderSource,
    fragmentShaderSource: ForgeShaderSource,
  ): string[] {
    const declarations = new Map<string, UniformSourceDeclaration>();
    const names: string[] = [];

    for (const source of [vertexShaderSource, fragmentShaderSource]) {
      for (const declaration of source.uniformDeclarations.values()) {
        addUniformDeclaration(declarations, declaration, this.description);
      }
    }

    for (const declaration of declarations.values()) {
      const glslType = getUniformTypeByGlslName(declaration.glslTypeName);

      if (glslType === null) {
        continue;
      }

      const { name } = declaration;

      this._assertSupportedSampler(
        name,
        glslType.uniformType.glslName,
        declaration.size,
      );

      const uniform: UniformDeclaration = {
        name,
        glType: glslType.glType,
        uniformType: glslType.uniformType,
        size: declaration.size,
      };

      names.push(name);
      uniforms.set(name, uniform);

      if (declaration.isArray) {
        uniforms.set(`${name}${arrayElementZeroSuffix}`, uniform);
      }
    }

    return names;
  }

  /**
   * Records where to upload each uniform the linked program kept, in
   * program order, and what to upload when a material hasn't set it. A
   * declared uniform keeps its declared type and size; anything else the
   * program reports (members of a struct uniform) is typed from what
   * `getActiveUniform` reports.
   */
  private _addActiveUniforms(
    gl: WebGL2RenderingContext,
    uniforms: Map<string, UniformDeclaration>,
    blackTexture: () => Texture,
  ): ActiveUniform[] {
    const { program } = this;
    const activeUniforms: ActiveUniform[] = [];
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

      const uniform = uniforms.get(name) ?? {
        name,
        glType: info.type,
        uniformType: getUniformType(info.type),
        size: info.size,
      };

      if (uniform.uniformType) {
        this._assertSupportedSampler(
          name,
          uniform.uniformType.glslName,
          uniform.size,
        );
      }

      uniforms.set(name, uniform);
      uniforms.set(info.name, uniform);
      activeUniforms.push({
        ...uniform,
        location,
        defaultUpload: createDefaultUniformUpload(uniform, blackTexture),
      });
    }

    return activeUniforms;
  }

  /**
   * Rejects a sampler a `Texture` can't be bound to. Every sampler gets a
   * texture unit on bind (`blackTexture` when unset), and two samplers of
   * different types on one unit fail the draw, so an unsupported sampler is
   * rejected up front rather than left unbound.
   */
  private _assertSupportedSampler(
    name: string,
    glslName: string,
    size: number,
  ): void {
    const isSampler =
      getUniformTypeByGlslName(glslName)?.uniformType.kind === 'sampler';

    if (!isSampler) {
      return;
    }

    if (glslName !== supportedSamplerGlslName) {
      throw new Error(
        `Uniform "${name}" in ${this.description} is declared as ${glslName}, but materials only support ${supportedSamplerGlslName} uniforms, the type a Texture is sampled through.`,
      );
    }

    if (size > 1) {
      throw new Error(
        `Uniform "${name}" in ${this.description} is declared as ${glslName}[${size}], but materials don't support sampler arrays. Declare one sampler uniform per texture instead.`,
      );
    }
  }
}
