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
  ShaderCache,
  spriteFragmentShader,
  spriteVertexShader,
} from '../shaders/index.js';

/**
 * Creates and initializes a ShaderCache instance with predefined shader includes and shaders.
 *
 * The shader includes added to the ShaderCache provide reusable shader code snippets, such as
 * cubic interpolation, Perlin noise, quintic interpolation, radial gradients, random gradients,
 * signed distance functions (SDF) for circles, and oriented boxes.
 *
 * The shaders added to the ShaderCache include fragment and vertex shaders for rendering
 * radial gradients, Perlin noise, and sprites.
 *
 * @returns {ShaderCache} A ShaderCache instance populated with the predefined shader includes
 * and shaders.
 */
export function createShaderCache(): ShaderCache {
  const shaderCache = new ShaderCache();

  shaderCache.addInclude(
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

  shaderCache.addShader(
    radialGradientShader,
    perlinNoiseFragmentShader,
    spriteFragmentShader,
    spriteVertexShader,
  );

  return shaderCache;
}
