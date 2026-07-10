import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  Color,
  combineInstanceDataSegments,
  createQuadGeometry,
  createTextureFromImage,
  ForgeShaderSource,
  Material,
  Renderable,
  RenderContext,
  SpriteEcsComponent,
  spriteInstanceDataSegment,
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
  const { shaderCache, gl, imageCache } = renderContext;

  const [logoImage, noiseImage, gradientImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/forge-logo.png')),
    imageCache.getOrLoad(getAssetUrl('img/perlin_noise_2d.png')),
    imageCache.getOrLoad(getAssetUrl('img/Burn_Gradient.png')),
  ]);

  shaderCache.addShader(new ForgeShaderSource(erosionShader));

  const vertexShader = shaderCache.getShader('sprite.vert');
  const fragmentShader = shaderCache.getShader('erosion.frag');

  const material = new Material(vertexShader, fragmentShader, gl);

  material.setUniform('u_texture', createTextureFromImage(gl, logoImage));
  material.setUniform('u_noiseTexture', createTextureFromImage(gl, noiseImage));
  material.setUniform(
    'u_burnGradient',
    createTextureFromImage(gl, gradientImage),
  );
  material.setUniform('u_burnProgress', 0);
  material.setUniform('u_edgeWidth', initialEdgeWidth);

  const { floatsPerInstance, bindInstanceData, setupInstanceAttributes } =
    combineInstanceDataSegments(spriteInstanceDataSegment);

  const renderable = new Renderable(
    createQuadGeometry(gl),
    material,
    floatsPerInstance,
    layer,
    bindInstanceData,
    setupInstanceAttributes,
  );

  return {
    enabled: true,
    width: logoImage.width,
    height: logoImage.height,
    pivot: new Vector2(0.5, 0.5),
    tintColor: Color.white,
    renderable,
    uvOffset: new Vector2(0, 0),
    uvScale: new Vector2(1, 1),
    layer,
  };
}
