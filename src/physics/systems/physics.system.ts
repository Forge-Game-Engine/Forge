import { Engine as MatterJsPhysicsEngine } from 'matter-js';

import { PositionComponent, RotationComponent, type Time } from '../../common';
import { Entity, System } from '../../ecs';
import { PhysicsBodyComponent } from '../components';

export class PhysicsSystem extends System {
  private _time: Time;
  private _engine: MatterJsPhysicsEngine;

  constructor(time: Time, engine: MatterJsPhysicsEngine) {
    super('physics', [
      PositionComponent.symbol,
      RotationComponent.symbol,
      PhysicsBodyComponent.symbol,
    ]);

    this._time = time;
    this._engine = engine;
  }

  public override beforeAll(entities: Entity[]): Entity[] {
    MatterJsPhysicsEngine.update(this._engine, this._time.deltaTime);
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
