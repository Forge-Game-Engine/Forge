import { Entity, Random, System, World } from '../../src';

export class FPSSystem extends System {
  private readonly _divElement: HTMLDivElement;
  private readonly _world: World;

  private _nextUpdate: number = 0;
  private _random: Random = new Random('fps');

  constructor(divElement: HTMLDivElement, world: World) {
    super('fps', []);
    this._divElement = divElement;
    this._world = world;
  }

  public beforeAll(entities: Entity[]): Entity[] {
    if (this._world.time.time > this._nextUpdate) {    
      this._divElement.innerHTML = `fps: ${this._world.time.fps}`;

      this._nextUpdate = this._world.time.time + 1000;
    }

    return entities;
  }

  public run(_entity: Entity): void {}
}
