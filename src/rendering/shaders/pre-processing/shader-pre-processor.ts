import { ForgeShaderSource } from './forge-shader-source';

export interface ShaderPreProcessor {
  process: (shader: ForgeShaderSource) => string;
}
