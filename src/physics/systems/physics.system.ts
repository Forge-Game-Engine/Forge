import { Body, Engine } from 'matter-js';

import {
  PositionComponent,
  RotationComponent,
  ScaleComponent,
  type Time,
} from '../../common';
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

    const scaleComponent = entity.getComponentRequired<ScaleComponent>(
      ScaleComponent.symbol,
    );

    if (physicsBodyComponent.physicsBody.isStatic) {
      Body.setPosition(physicsBodyComponent.physicsBody, {
        x: positionComponent.x,
        y: positionComponent.y,
      });

      Body.setAngle(
        physicsBodyComponent.physicsBody,
        rotationComponent.radians,
      );

      Body.scale(
        physicsBodyComponent.physicsBody,
        scaleComponent.x,
        scaleComponent.y,
      );
    } else {
      positionComponent.x = physicsBodyComponent.physicsBody.position.x;
      positionComponent.y = physicsBodyComponent.physicsBody.position.y;

      rotationComponent.radians = physicsBodyComponent.physicsBody.angle;
    }
  }
}
