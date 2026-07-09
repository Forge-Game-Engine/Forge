import { createComponentId } from '../../ecs/ecs-component.js';
import { Color, Renderable, Vector2 } from '../../index.js';

export interface SpriteEcsComponent {
  width: number;
  height: number;
  pivot: Vector2;
  tintColor: Color;
  renderable: Renderable;
  uvOffset: Vector2;
  uvScale: Vector2;
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
