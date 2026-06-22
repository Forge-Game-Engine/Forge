import { Entity, PositionComponent, System, World } from '../../src';
import { CircleMotionComponent } from './circle-motion-component';

/**
 * Moves every entity with a `CircleMotionComponent` around its center point over time.
 */
export class CircleMotionSystem extends System {
  private readonly _world: World;

  constructor(world: World) {
    super('circle-motion', [
      PositionComponent.symbol,
      CircleMotionComponent.symbol,
    ]);

    this._world = world;
  }

  public run(entity: Entity) {
    const position = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );
    const motion = entity.getComponentRequired<CircleMotionComponent>(
      CircleMotionComponent.symbol,
    );

    const angle =
      motion.phase + this._world.time.timeInSeconds * motion.angularSpeed;

    position.x = motion.centerX + Math.cos(angle) * motion.radius;
    position.y = motion.centerY + Math.sin(angle) * motion.radius;
  }
}
