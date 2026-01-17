import { Vector2 } from '../../src';
import { createComponentId } from '../../src/new-ecs/ecs-component';

export interface MoveEcsComponent {
  center: Vector2;
  amount: number;
  offset: number;
}

export const moveId = createComponentId<MoveEcsComponent>('move');
