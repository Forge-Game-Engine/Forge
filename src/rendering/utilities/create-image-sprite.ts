import { Entity } from '../../ecs/index.js';
import { SpriteMaterial } from '../materials/index.js';
import { RenderContext } from '../render-context.js';
import type { ForgeRenderLayer } from '../render-layers/index.js';
import type { Sprite } from '../sprite.js';
import { createSprite } from './create-sprite.js';

/**
 * Creates a sprite using the provided image and render layer.
 * @param image - The image to use for the sprite.
 * @param renderLayer - The render layer to which the sprite will be added
 * @param renderContext - The render context used for shader retrieval.
 * @param cameraEntity - The camera entity to which the sprite will be rendered.
 * @param vertexShaderName - The vertex shader to use for the sprite material.
 * @param fragmentShaderName - The fragment shader to use for the sprite material.
 * @returns The created sprite.
 */
export async function createImageSprite(
  imagePath: string,
  renderLayer: ForgeRenderLayer,
  renderContext: RenderContext,
  cameraEntity: Entity,
  vertexShaderName: string = 'sprite.vert.glsl',
  fragmentShaderName: string = 'sprite.frag.glsl',
): Promise<Sprite> {
  const spriteVertexShader =
    renderContext.shaderCache.getShader(vertexShaderName);
  const spriteFragmentShader =
    renderContext.shaderCache.getShader(fragmentShaderName);

  const image = await renderContext.imageCache.getOrLoad(imagePath);

  const material = new SpriteMaterial(
    renderLayer.context,
    spriteVertexShader,
    spriteFragmentShader,
    image,
    cameraEntity,
  );
  const sprite = createSprite(material, renderLayer, image.width, image.height);

  return sprite;
}
