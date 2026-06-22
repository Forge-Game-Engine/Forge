import {
  Entity,
  PositionComponent,
  Random,
  Sprite,
  SpriteComponent,
  System,
  World,
} from '../../src';
import { CircleMotionComponent } from './circle-motion-component';
import { SoakTestComponent, SoakTestSample } from './soak-test-component';

export interface SoakTestOptions {
  world: World;
  sprite: Sprite;
  entitiesPerStep?: number;
  stepIntervalInMilliseconds?: number;
  targetFps?: number;
  warmupInMilliseconds?: number;
}

/**
 * Gradually spawns circling sprites into the world and records FPS vs entity
 * count samples, so performance can be graphed against entity count later.
 * Keeps spawning until the FPS drops to `targetFps`.
 */
export class SoakTestSystem extends System {
  private readonly _world: World;
  private readonly _sprite: Sprite;
  private readonly _entitiesPerStep: number;
  private readonly _stepIntervalInMilliseconds: number;
  private readonly _targetFps: number;
  private readonly _warmupInMilliseconds: number;
  private readonly _random = new Random('soak-test');

  constructor(options: SoakTestOptions) {
    super('soak-test', [SoakTestComponent.symbol]);

    this._world = options.world;
    this._sprite = options.sprite;
    this._entitiesPerStep = options.entitiesPerStep ?? 200;
    this._stepIntervalInMilliseconds =
      options.stepIntervalInMilliseconds ?? 250;
    this._targetFps = options.targetFps ?? 30;
    this._warmupInMilliseconds = options.warmupInMilliseconds ?? 2000;
  }

  public run(entity: Entity) {
    const soakTest = entity.getComponentRequired<SoakTestComponent>(
      SoakTestComponent.symbol,
    );

    if (soakTest.isComplete) {
      return;
    }

    const { time } = this._world;

    if (time.timeInMilliseconds < soakTest.nextStepAtMilliseconds) {
      return;
    }

    soakTest.nextStepAtMilliseconds =
      time.timeInMilliseconds + this._stepIntervalInMilliseconds;

    this._spawnEntities();

    soakTest.samples.push({
      entityCount: this._world.entityCount,
      fps: time.fps,
    });

    const isPastWarmup = time.timeInMilliseconds >= this._warmupInMilliseconds;

    if (isPastWarmup && time.fps <= this._targetFps) {
      soakTest.isComplete = true;
      this._downloadResults(soakTest.samples);
    }
  }

  private _spawnEntities() {
    for (let i = 0; i < this._entitiesPerStep; i++) {
      const centerX = this._random.randomFloat(-2000, 2000);
      const centerY = this._random.randomFloat(-2000, 2000);
      const radius = this._random.randomFloat(20, 150);

      this._world.buildAndAddEntity('soak-test-sprite', [
        new PositionComponent(centerX + radius, centerY),
        new SpriteComponent(this._sprite),
        new CircleMotionComponent({
          centerX,
          centerY,
          radius,
          angularSpeed: this._random.randomFloat(0.5, 2),
          phase: this._random.randomFloat(0, Math.PI * 2),
        }),
      ]);
    }
  }

  private _downloadResults(samples: SoakTestSample[]) {
    console.log('Soak test complete', samples);

    const json = JSON.stringify(samples, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'soak-test-results.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}
