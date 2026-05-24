import { Vector2 } from '../../index.js';
import { Material } from '../materials/index.js';
import { RenderContext } from '../render-context.js';
import { createTextureFromImage } from '../shaders/index.js';
import type { Sprite } from '../sprite.js';
import { createSprite } from './create-sprite.js';

/**
 * Creates a sprite using the provided image and render layer.
 * @param renderContext - The render context used for shader retrieval.
 * @param cameraEntity - The camera entity for the renderable.
 * @param vertexShaderName - The vertex shader to use for the sprite material.
 * @param fragmentShaderName - The fragment shader to use for the sprite material.
 * @returns The created sprite.
 */
export function createImageSprite(
  image: HTMLImageElement,
  renderContext: RenderContext,
  layer: number,
  vertexShaderName: string = 'sprite.vert',
  fragmentShaderName: string = 'sprite.frag',
  frameDimensions?: Vector2,
): Sprite {
  const { shaderCache, gl } = renderContext;

  const spriteVertexShader = shaderCache.getShader(vertexShaderName);
  const spriteFragmentShader = shaderCache.getShader(fragmentShaderName);

  const material = new Material(spriteVertexShader, spriteFragmentShader, gl);

  material.setUniform('u_texture', createTextureFromImage(gl, image));

  const sprite = createSprite(
    material,
    renderContext,
    layer,
    frameDimensions?.x ?? image.width,
    frameDimensions?.y ?? image.height,
  );

  return sprite;
}
