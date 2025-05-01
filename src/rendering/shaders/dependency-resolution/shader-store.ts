import type { ForgeShaderSource } from './forge-shader-source';
import { resolveIncludes } from './resolve-includes';

export class ShaderStore {
  private readonly _shaders: ForgeShaderSource[];
  private readonly _includes: ForgeShaderSource[];
  private readonly _resolvedShaders: Map<string, string>;

  constructor() {
    this._shaders = [];
    this._includes = [];
    this._resolvedShaders = new Map();
  }

  public addShader(shader: ForgeShaderSource): void {
    if (this._shaders.includes(shader)) {
      return;
    }

    this._shaders.push(shader);
  }

  public addInclude(shader: ForgeShaderSource): void {
    if (this._includes.includes(shader)) {
      return;
    }

    this._includes.push(shader);
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
