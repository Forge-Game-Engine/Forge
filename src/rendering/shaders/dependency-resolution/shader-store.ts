import { ForgeShaderSource } from './forge-shader-source.js';
import { resolveIncludes } from './resolve-includes.js';

export class ShaderStore {
  private readonly _shaders: ForgeShaderSource[];
  private readonly _includes: ForgeShaderSource[];
  private readonly _resolvedShaders: Map<string, string>;

  constructor() {
    this._shaders = [];
    this._includes = [];
    this._resolvedShaders = new Map();
  }

  public addShader(...shaders: string[]): void {
    for (const shader of shaders) {
      const shaderSource = new ForgeShaderSource(shader);

      if (
        this._shaders.find(
          (existingShader) => existingShader.name === shaderSource.name,
        )
      ) {
        continue;
      }

      this._shaders.push(shaderSource);
    }
  }

  public addInclude(...shaders: string[]): void {
    for (const shader of shaders) {
      const shaderSource = new ForgeShaderSource(shader);

      if (
        this._includes.find(
          (existingInclude) => existingInclude.name === shaderSource.name,
        )
      ) {
        continue;
      }

      this._includes.push(shaderSource);
    }
  }

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
