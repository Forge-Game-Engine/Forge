import { PositionEcsComponent, positionId, Time } from '../../src';
import { EcsSystem } from '../../src/new-ecs';
import { MoveEcsComponent, moveId } from './move-component';

export const createMoveEcsSystem = (
  time: Time,
): EcsSystem<[PositionEcsComponent, MoveEcsComponent]> => ({
  query: [positionId, moveId],
  run: (result) => {
    const [positionComponent, moveComponent] = result.components;

    positionComponent.world.x =
      moveComponent.center.x +
      moveComponent.amount * Math.cos(time.timeInSeconds);

    positionComponent.world.y =
      moveComponent.center.y +
      moveComponent.amount * Math.sin(time.timeInSeconds);
  },
});
