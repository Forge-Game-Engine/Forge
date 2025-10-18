import {
  cubicShaderInclude,
  perlinNoiseFragmentShader,
  perlinNoiseShaderInclude,
  quinticShaderInclude,
  radialGradientShader,
  radialGradientShaderInclude,
  randomGradientShaderInclude,
  sdfBoxShaderInclude,
  sdfCircleShaderInclude,
  sdfEquilateralTriangleInclude,
  sdfHexagonInclude,
  sdfOctagonInclude,
  sdfOrientedBoxShaderInclude,
  sdfRhombusInclude,
  sdfTrapezoidInclude,
  ShaderStore,
  spriteFragmentShader,
  spriteVertexShader,
} from '../shaders';

/**
 * Creates and initializes a ShaderStore instance with predefined shader includes and shaders.
 *
 * The shader includes added to the ShaderStore provide reusable shader code snippets, such as
 * cubic interpolation, Perlin noise, quintic interpolation, radial gradients, random gradients,
 * signed distance functions (SDF) for circles, and oriented boxes.
 *
 * The shaders added to the ShaderStore include fragment and vertex shaders for rendering
 * radial gradients, Perlin noise, and sprites.
 *
 * @returns {ShaderStore} A ShaderStore instance populated with the predefined shader includes
 * and shaders.
 */
export function createShaderStore(): ShaderStore {
  const shaderStore = new ShaderStore();

  shaderStore.addInclude(
    cubicShaderInclude,
    perlinNoiseShaderInclude,
    quinticShaderInclude,
    radialGradientShaderInclude,
    randomGradientShaderInclude,
    sdfBoxShaderInclude,
    sdfCircleShaderInclude,
    sdfEquilateralTriangleInclude,
    sdfHexagonInclude,
    sdfOctagonInclude,
    sdfOrientedBoxShaderInclude,
    sdfRhombusInclude,
    sdfTrapezoidInclude,
  );

  shaderStore.addShader(
    radialGradientShader,
    perlinNoiseFragmentShader,
    spriteFragmentShader,
    spriteVertexShader,
  );

  return shaderStore;
}
