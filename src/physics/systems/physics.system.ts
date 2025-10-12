import { Body, Engine } from 'matter-js';

import { PositionComponent, RotationComponent, type Time } from '../../common';
import { Entity, System } from '../../ecs';
import { PhysicsBodyComponent } from '../components';

export class PhysicsSystem extends System {
  private readonly _time: Time;
  private readonly _engine: Engine;

  constructor(time: Time, engine: Engine) {
    super(Symbol('physics'), [
      PositionComponent.symbol,
      RotationComponent.symbol,
      PhysicsBodyComponent.symbol,
    ]);

    this._time = time;
    this._engine = engine;
  }

  public override beforeAll(entities: Entity[]): Entity[] {
    Engine.update(this._engine, this._time.deltaTimeInMilliseconds);

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

    if (physicsBodyComponent.physicsBody.isStatic) {
      Body.setPosition(physicsBodyComponent.physicsBody, {
        x: positionComponent.world.x,
        y: positionComponent.world.y,
      });

      Body.setAngle(physicsBodyComponent.physicsBody, rotationComponent.world);
    } else {
      positionComponent.world.x = physicsBodyComponent.physicsBody.position.x;
      positionComponent.world.y = physicsBodyComponent.physicsBody.position.y;

      rotationComponent.world = physicsBodyComponent.physicsBody.angle;
    }
  }
}
