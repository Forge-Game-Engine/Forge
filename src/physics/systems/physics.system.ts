import { Body, Engine } from 'matter-js';

import {
  PositionComponent,
  RotationComponent,
  type Time,
} from '../../common/index.js';
import { Entity, System } from '../../ecs/index.js';
import { PhysicsBodyComponent } from '../components/index.js';

export class PhysicsSystem extends System {
  private readonly _time: Time;
  private readonly _engine: Engine;

  constructor(time: Time, engine: Engine) {
    super(
      [PositionComponent, RotationComponent, PhysicsBodyComponent],
      'physics',
    );

    this._time = time;
    this._engine = engine;
  }

  public override beforeAll(entities: Entity[]): Entity[] {
    Engine.update(this._engine, this._time.deltaTimeInMilliseconds);

    return entities;
  }

  public override run(entity: Entity): void {
    const physicsBodyComponent =
      entity.getComponentRequired(PhysicsBodyComponent);

    const positionComponent = entity.getComponentRequired(PositionComponent);

    const rotationComponent = entity.getComponentRequired(RotationComponent);

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
