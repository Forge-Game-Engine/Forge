import {
  cubicShaderInclude,
  perlinNoiseFragmentShader,
  perlinNoiseShaderInclude,
  quinticShaderInclude,
  radialGradientShader,
  radialGradientShaderInclude,
  randomGradientShaderInclude,
  sdfCircleShaderInclude,
  sdfOrientedBoxShaderInclude,
  ShaderStore,
  spriteFragmentShader,
  spriteVertexShader,
} from '../shaders';

export const shaderStore = new ShaderStore();

shaderStore.addInclude(
  cubicShaderInclude,
  perlinNoiseShaderInclude,
  quinticShaderInclude,
  radialGradientShaderInclude,
  randomGradientShaderInclude,
  sdfCircleShaderInclude,
  sdfOrientedBoxShaderInclude,
);

shaderStore.addShader(
  radialGradientShader,
  perlinNoiseFragmentShader,
  spriteFragmentShader,
  spriteVertexShader,
);
