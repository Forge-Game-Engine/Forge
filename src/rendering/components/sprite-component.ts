import { createComponentId } from '../../ecs/ecs-component.js';
import { Color, Renderable, Vector2 } from '../../index.js';

export interface SpriteEcsComponent {
  /**
   * The sprite's width in world units. Scales the unit quad horizontally
   * before it's rotated and translated to the entity's world position.
   */
  width: number;

  /**
   * The sprite's height in world units. Scales the unit quad vertically
   * before it's rotated and translated to the entity's world position.
   */
  height: number;

  /**
   * The sprite's origin, normalized to the sprite's own size: `(0, 0)` is
   * the top-left corner, `(0.5, 0.5)` (the default) is the center, and
   * `(1, 1)` is the bottom-right corner. Determines which point of the
   * sprite is placed at, and rotated/scaled around, the entity's position.
   */
  pivot: Vector2;

  /**
   * A color multiplied against the sprite's sampled texture color (RGB
   * only; the texture's own alpha is used unmodified) to tint it. Defaults
   * to `Color.white`, which leaves the texture unmodified.
   */
  tintColor: Color;

  /**
   * The geometry, material, and instancing configuration used to draw this
   * sprite. Sprites sharing the same `Renderable` are batched into a single
   * instanced draw call, and `renderable.category` is matched against each
   * camera's culling mask to decide whether the camera draws this sprite at
   * all.
   */
  renderable: Renderable;

  /**
   * The top-left corner of the region of the texture to sample, as a
   * normalized (0 to 1) fraction of the texture's full size. Used with
   * `uvScale` to select a single frame from a texture atlas/sprite sheet;
   * updated automatically by the sprite animation system when the sprite
   * has a `SpriteAnimationEcsComponent`.
   */
  uvOffset: Vector2;

  /**
   * The size of the region of the texture to sample, as a normalized (0 to
   * 1) fraction of the texture's full width/height. Defaults to `(1, 1)`
   * (the whole texture). Used with `uvOffset` to select a single frame from
   * a texture atlas/sprite sheet.
   */
  uvScale: Vector2;

  /**
   * Whether this sprite is drawn. When `false`, the render system skips
   * this entity entirely for every camera, before any culling-mask check.
   */
  enabled: boolean;

  /**
   * The draw-order layer for this sprite, relative to other sprites drawn by
   * the same camera: lower layers are drawn first, so higher layers appear
   * on top. Sprites in the same layer are then ordered by depth (world Y
   * position).
   */
  layer: number;
}

export const spriteId = createComponentId<SpriteEcsComponent>('sprite');
