import * as forge from '../../../src';
import { createShip } from '../create-ship';
import { ShipMovementSystem } from '../ship';
import { StarComponent, StarSystem } from '../star';
import { StarfieldComponent, StarfieldSystem } from '../starfield';

export async function createShipPilotScene(
  game: forge.Game,
  gameContainer: HTMLElement,
  imageCache: forge.ImageCache,
  shaderStore: forge.ShaderStore,
) {
  const { scene, world, layerService, cameraEntity, inputsEntity } =
    forge.createScene('ship-pilot', game);

  const worldSpace = new forge.Space(
    window.innerWidth * 5,
    window.innerHeight * 5,
  );

  const [backgroundRenderLayer, foregroundRenderLayer] =
    forge.addForgeRenderLayers(
      [forge.DEFAULT_LAYERS.background, forge.DEFAULT_LAYERS.foreground],
      gameContainer,
      layerService,
      world,
      cameraEntity,
    );

  await createShip(imageCache, foregroundRenderLayer.layer, world, shaderStore);

  const starfieldComponent = new StarfieldComponent(10_000, worldSpace);

  world.buildAndAddEntity('starfield', [starfieldComponent]);

  const image = await imageCache.getOrLoad('star_small.png');

  const sprite = forge.createImageSprite(
    image,
    backgroundRenderLayer.layer,
    shaderStore,
  );

  const random = new forge.Random();

  const createStar = () => {
    const scaleComponent = new forge.ScaleComponent(0.5, 0.5);

    const starEntity = world.buildAndAddEntity('star', [
      new forge.PositionComponent(0, 0),
      scaleComponent,
      new forge.RotationComponent(0),
      new forge.SpriteComponent(sprite),
      new forge.AnimationComponent({
        duration: random.randomFloat(1000, 5000),
        updateCallback: (value: number) => {
          scaleComponent.x = value * 0.5;
          scaleComponent.y = value * 0.5;
        },
        loop: 'pingpong',
      }),
      new StarComponent(random),
    ]);

    return starEntity;
  };

  const disposeStar = (entity: forge.Entity) => {
    starfieldComponent.numberOfStars--;
    entity.enabled = false;
  };

  const starPool = new forge.ObjectPool([], createStar, disposeStar);

  const shipMovementSystem = new ShipMovementSystem(inputsEntity, game.time);
  const animationSystem = new forge.AnimationSystem(game.time);
  const starSystem = new StarSystem(starPool);

  const starfieldSystem = new StarfieldSystem(starPool);

  world.addSystems(
    shipMovementSystem,
    starSystem,
    starfieldSystem,
    animationSystem,
  );

  return scene;
}
