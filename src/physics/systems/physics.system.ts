import { Engine } from 'matter-js';

import { PositionComponent, RotationComponent, type Time } from '../../common';
import { Entity, System } from '../../ecs';
import { PhysicsBodyComponent } from '../components';

export class PhysicsSystem extends System {
  private readonly _time: Time;
  private readonly _engine: Engine;

  constructor(time: Time, engine: Engine) {
    super('physics', [
      PositionComponent.symbol,
      RotationComponent.symbol,
      PhysicsBodyComponent.symbol,
    ]);

    this._time = time;
    this._engine = engine;
  }

  public override beforeAll(entities: Entity[]): Entity[] {
    Engine.update(this._engine, this._time.deltaTime);

    return entities;
  }

  public override run(entity: Entity): void {
    const physicsBodyComponent =
      entity.getComponentRequired<PhysicsBodyComponent>(
        PhysicsBodyComponent.symbol,
      );

    const positionComponent = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );

    const rotationComponent = entity.getComponentRequired<RotationComponent>(
      RotationComponent.symbol,
    );

    positionComponent.x = physicsBodyComponent.physicsBody.position.x;
    positionComponent.y = physicsBodyComponent.physicsBody.position.y;

    rotationComponent.radians = physicsBodyComponent.physicsBody.angle;
  }
}
