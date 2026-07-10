import {
  Color,
  createQuadGeometry,
  Renderable,
  SpriteEcsComponent,
  Vector2,
} from '../../index.js';
import { Material } from '../materials/index.js';
import { RenderContext } from '../render-context.js';
import { createTextureFromImage } from '../shaders/index.js';
import { combineInstanceDataSegments } from './instance-data-segment.js';
import { spriteInstanceDataSegment } from './sprite-instance-data-segment.js';

/**
 * Creates a sprite using the provided image and render layer.
 * @param image - The image to use for the sprite.
 * @param renderContext - The render context to be used.
 * @param layer - The render layer for the sprite.
 * @param frameDimensions - The dimensions of a single frame in the image (for sprite sheets).
 * @returns The created sprite.
 */
export function createImageSprite(
  image: HTMLImageElement,
  renderContext: RenderContext,
  layer: number,
  frameDimensions: Vector2 = new Vector2(image.width, image.height),
): SpriteEcsComponent {
  const { shaderCache, gl } = renderContext;

  const spriteVertexShader = shaderCache.getShader('sprite.vert');
  const spriteFragmentShader = shaderCache.getShader('sprite.frag');

  const material = new Material(spriteVertexShader, spriteFragmentShader, gl);

  material.setUniform('u_texture', createTextureFromImage(gl, image, true));

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
    width: frameDimensions.x,
    height: frameDimensions.y,
    pivot: new Vector2(0.5, 0.5),
    tintColor: Color.white,
    renderable,
    uvOffset: new Vector2(0, 0),
    uvScale: new Vector2(1, 1),
    layer: 0,
  };
}
