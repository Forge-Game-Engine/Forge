import { EcsWorld } from '../../ecs/ecs-world.js';
import { Renderable } from '../renderable.js';
import { Sprite } from '../sprite.js';

export type BindInstanceDataCallback = (
  entity: number,
  world: EcsWorld,
  instanceDataBufferArray: Float32Array,
  offset: number,
) => void;

export type SetupInstanceAttributesCallback = (
  gl: WebGL2RenderingContext,
  renderable: Renderable,
) => void;

/**
 * Creates a sprite using the provided material and render context.
 * @param material - The material to use for the sprite.
 * @param renderContext - The render context to be used.
 * @param cameraEntity - The camera entity for the renderable.
 * @param width - The width of the sprite.
 * @param height - The height of the sprite.
 * @param bindInstanceData - The callback function to bind instance data for the sprite.
 * @param setupInstanceAttributes - The callback function to set up instance attributes for the sprite.
 * @returns The created sprite.
 */
export function createSprite(
  width: number,
  height: number,
  renderable: Renderable,
): Sprite {
  const sprite = new Sprite({
    renderable,
    width,
    height,
  });

  return sprite;
}
