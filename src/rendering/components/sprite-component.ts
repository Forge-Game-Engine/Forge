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
}

export const spriteId = createComponentId<SpriteEcsComponent>('sprite');
