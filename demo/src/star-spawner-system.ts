import {
  AnimationComponent,
  degreesToRadians,
  Entity,
  PositionComponent,
  Random,
  RotationComponent,
  ScaleComponent,
  Space,
  Sprite,
  SpriteComponent,
  System,
  World,
} from '../../src';

export class StarSpawnerSystem extends System {
  private readonly _world: World;
  private readonly _newStarEvery: number;
  private readonly _numberOfStarsToSpawnAtATime: number;
  private readonly _sprite: Sprite;
  private readonly _space: Space;
  private readonly _random: Random = new Random('star-spawner');

  private _nextSpawn: number = 0;

  constructor(
    world: World,
    sprite: Sprite,
    space: Space,
    newStarEvery: number,
    numberOfStarsToSpawnAtATime: number,
  ) {
    super('starSpawner', []);
    this._world = world;
    this._newStarEvery = newStarEvery;
    this._numberOfStarsToSpawnAtATime = numberOfStarsToSpawnAtATime;
    this._sprite = sprite;
    this._space = space;
  }

  public run(_entity: Entity): void {
    if (this._world.time.fps < 30 && this._world.time.time > 5000) {
      this._world.removeSystem(this);
    }

    if (this._world.time.time > this._nextSpawn) {
      for (let i = 0; i < this._numberOfStarsToSpawnAtATime; i++) {
        this.spawnStar();
      }

      this._nextSpawn = this._world.time.time + this._newStarEvery;
    }
  }

  private spawnStar(): void {
    const scale = this._random.randomFloat(0.1, 0.5);
    const rotation = new RotationComponent(0);

    this._world.buildAndAddEntity(`star`, [
      new PositionComponent(
        this._random.randomInt(-this._space.width / 2, this._space.width / 2),
        this._random.randomInt(-this._space.height / 2, this._space.height / 2),
      ),
      new SpriteComponent(this._sprite),
      new ScaleComponent(scale, scale),
      rotation,
      new AnimationComponent({
        duration: 5000,
        loop: 'pingpong',
        updateCallback: (t) => {
          rotation.radians = degreesToRadians(180) * t;
        },
      }),
    ]);
  }
}
