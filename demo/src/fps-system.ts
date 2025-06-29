import { Entity, System, World } from '../../src';

export class FPSSystem extends System {
  private readonly _divElement: HTMLDivElement;
  private readonly _world: World;

  private readonly fpsValues = new Array<{ entities: number; fps: number }>();

  private _nextUpdate: number = 0;

  constructor(divElement: HTMLDivElement, world: World) {
    super('fps', []);
    this._divElement = divElement;
    this._world = world;
  }

  public beforeAll(entities: Entity[]): Entity[] {
    if (this._world.time.time > this._nextUpdate) {
      this._divElement.innerHTML = `fps: ${this._world.time.fps}`;

      this._nextUpdate = this._world.time.time + 0;

      this.fpsValues.push({
        fps: this._world.time.fps,
        entities: this._world.entityCount,
      });
    }

    if (this._world.time.fps < 30 && this._world.time.time > 5000) {
      console.log(JSON.stringify(this.fpsValues, null, 2));
      this._world.removeSystem(this);
    }

    return entities;
  }

  public run(_entity: Entity): void {}
}
