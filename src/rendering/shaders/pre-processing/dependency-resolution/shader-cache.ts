import { ForgeShaderSource } from '../forge-shader-source.js';
import { ShaderPreProcessor } from '../shader-pre-processor.js';

export class ShaderCache {
  private readonly _shaders: Map<string, ForgeShaderSource>;
  private readonly _processedShaders: Map<string, ForgeShaderSource>;
  private readonly _preProcessors: ShaderPreProcessor[];

  constructor(preProcessors: ShaderPreProcessor[]) {
    this._shaders = new Map();
    this._processedShaders = new Map();
    this._preProcessors = preProcessors;
  }

  public addShader(
    shaderSource: ForgeShaderSource,
    preProcess: boolean = true,
  ): this {
    if (this._shaders.has(shaderSource.name)) {
      return this;
    }

    if (preProcess) {
      shaderSource.applyPreProcessors(this._preProcessors);
      this._processedShaders.set(shaderSource.name, shaderSource);
    }

    this._shaders.set(shaderSource.name, shaderSource);

    return this;
  }

  /**
   * Retrieves and resolves a shader by name.
   * @param name - The name of the shader to retrieve.
   * @returns The resolved shader.
   */
  public getShader(name: string): ForgeShaderSource {
    if (this._processedShaders.has(name)) {
      return this._processedShaders.get(name)!;
    }

    const shader = this._shaders.get(name);

    if (!shader) {
      throw new Error(`Shader with name ${name} not found.`);
    }

    shader.applyPreProcessors(this._preProcessors);
    this._processedShaders.set(name, shader);

    return shader;
  }
}
