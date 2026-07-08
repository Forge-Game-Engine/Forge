import {
  cubicShaderInclude,
  ForgeShaderSource,
  passthroughFragmentShader,
  passthroughVertexShader,
  perlinNoiseFragmentShader,
  perlinNoiseShaderInclude,
  quinticShaderInclude,
  radialGradientShader,
  radialGradientShaderInclude,
  randomGradientShaderInclude,
  ResolveIncludesPreProcessor,
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
  const includeMap = [
    new ForgeShaderSource(cubicShaderInclude),
    new ForgeShaderSource(perlinNoiseShaderInclude),
    new ForgeShaderSource(quinticShaderInclude),
    new ForgeShaderSource(radialGradientShaderInclude),
    new ForgeShaderSource(randomGradientShaderInclude),
    new ForgeShaderSource(sdfBoxShaderInclude),
    new ForgeShaderSource(sdfCircleShaderInclude),
    new ForgeShaderSource(sdfEquilateralTriangleInclude),
    new ForgeShaderSource(sdfHexagonInclude),
    new ForgeShaderSource(sdfOctagonInclude),
    new ForgeShaderSource(sdfOrientedBoxShaderInclude),
    new ForgeShaderSource(sdfRhombusInclude),
    new ForgeShaderSource(sdfTrapezoidInclude),
  ];

  const includesPreProcessor = new ResolveIncludesPreProcessor(includeMap);

  const shaderCache = new ShaderCache([includesPreProcessor])
    .addShader(new ForgeShaderSource(radialGradientShader))
    .addShader(new ForgeShaderSource(perlinNoiseFragmentShader))
    .addShader(new ForgeShaderSource(spriteFragmentShader))
    .addShader(new ForgeShaderSource(spriteVertexShader))
    .addShader(new ForgeShaderSource(passthroughFragmentShader))
    .addShader(new ForgeShaderSource(passthroughVertexShader));

  return shaderCache;
}
