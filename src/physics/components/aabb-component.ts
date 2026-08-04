import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';

export interface AabbDefaultedOptions {
  min: Vector2;
  max: Vector2;
}

export type AabbEcsComponent = AabbDefaultedOptions;

export const aabbId = createComponentId<AabbEcsComponent>('aabb');

export function addAabbComponent(
  world: EcsWorld,
  entity: number,
  options?: Partial<AabbEcsComponent>,
): AabbEcsComponent {
  const defaultAabbOptions: AabbDefaultedOptions = {
    min: Vec2.zero,
    max: Vec2.zero,
  };

  const component: AabbEcsComponent = {
    ...defaultAabbOptions,
    ...options,
  };

  return world.addComponent(entity, aabbId, component);
}
