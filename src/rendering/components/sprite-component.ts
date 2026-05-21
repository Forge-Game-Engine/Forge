import { createComponentId } from '../../ecs/ecs-component.js';
import { Sprite } from '../sprite.js';

export interface SpriteEcsComponent {
  sprite: Sprite;
  enabled: boolean;
}

export const spriteId = createComponentId<SpriteEcsComponent>('sprite');
