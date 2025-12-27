import { ForgeShaderSource } from './forge-shader-source.js';
import { resolveIncludes } from './resolve-includes.js';

export class ShaderCache {
  private readonly _shaders: ForgeShaderSource[];
  private readonly _includes: ForgeShaderSource[];
  private readonly _resolvedShaders: Map<string, string>;

  constructor() {
    this._shaders = [];
    this._includes = [];
    this._resolvedShaders = new Map();
  }

  public addShader(...rawShaders: string[]): void {
    for (const rawShader of rawShaders) {
      const shaderSource = new ForgeShaderSource(rawShader);

      if (
        this._shaders.some(
          (existingShader) => existingShader.name === shaderSource.name,
        )
      ) {
        continue;
      }

      this._shaders.push(shaderSource);
    }
  }

  public addInclude(...rawIncludes: string[]): void {
    for (const rawInclude of rawIncludes) {
      const shaderSource = new ForgeShaderSource(rawInclude);

      if (
        this._includes.some(
          (existingInclude) => existingInclude.name === shaderSource.name,
        )
      ) {
        continue;
      }

      this._includes.push(shaderSource);
    }
  }

  /**
   * Retrieves and resolves a shader by name.
   * @param name - The name of the shader to retrieve.
   * @returns The resolved shader source code.
   */
  public getShader(name: string): string {
    if (this._resolvedShaders.has(name)) {
      return this._resolvedShaders.get(name)!;
    }

    const shader = this._shaders.find((shader) => shader.name === name);

    if (!shader) {
      throw new Error(`Shader with name ${name} not found.`);
    }

    const resolvedSource = resolveIncludes(shader, this._includes);

    this._resolvedShaders.set(name, resolvedSource);

    return resolvedSource;
  }
}
