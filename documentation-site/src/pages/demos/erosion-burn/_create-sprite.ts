import { getAssetUrl } from '@site/src/utils/get-asset-url';

import {
  createImageSprite,
  createSpriteMaterial,
  ForgeShaderSource,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { erosionShader } from './_erosion.shader';

const initialEdgeWidth = 0.12;

/**
 * Creates a sprite that reuses the default sprite vertex shader, but renders
 * with a custom fragment shader that erodes the sprite's alpha using a noise
 * texture and colors the leading edge using a burn gradient texture.
 * @param renderContext - The render context used to build the material.
 * @param layer - The render layer the sprite should be drawn on.
 * @returns The created sprite.
 */
export async function createErosionSprite(
  renderContext: RenderContext,
  layer: number,
): Promise<SpriteEcsComponent> {
  const { shaderCache, textureCache } = renderContext;

  const [logoTexture, noiseTexture, gradientTexture] = await Promise.all([
    textureCache.getOrLoad(getAssetUrl('img/forge-logo.png')),
    textureCache.getOrLoad(getAssetUrl('img/perlin_noise_2d.png')),
    textureCache.getOrLoad(getAssetUrl('img/Burn_Gradient.png')),
  ]);

  shaderCache.addShader(new ForgeShaderSource(erosionShader));

  const material = createSpriteMaterial(renderContext, 'erosion.frag');

  material.setUniform('u_noiseTexture', noiseTexture);
  material.setUniform('u_burnGradient', gradientTexture);
  material.setUniform('u_burnProgress', 0);
  material.setUniform('u_edgeWidth', initialEdgeWidth);

  return {
    ...createImageSprite(logoTexture, {
      pixelsPerUnit: 1,
    }),
    material,
    category: layer,
    layer,
  };
}
