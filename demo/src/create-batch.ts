import {
  createImageSprite,
  Entity,
  ForgeRenderLayer,
  ImageCache,
  PositionComponent,
  Random,
  ScaleComponent,
  ShaderStore,
  SpriteComponent,
  World,
} from '../../src';

export const createBatch = async (
  imageSrc: string,
  imageCache: ImageCache,
  world: World,
  renderLayer: ForgeRenderLayer,
  shaderStore: ShaderStore,
  cameraEntity: Entity,
  size: number = 1000,
) => {
  const image = await imageCache.getOrLoad(imageSrc);

  const sprite = createImageSprite(
    image,
    renderLayer,
    shaderStore,
    cameraEntity,
  );

  const random = new Random(imageSrc);
  const entities: Entity[] = [];

  for (let i = 0; i < size; i++) {
    const entity = world.buildAndAddEntity('sprite', [
      new PositionComponent(
        random.randomFloat(-window.innerWidth / 2, window.innerWidth / 2),
        random.randomFloat(-window.innerHeight / 2, window.innerHeight / 2),
      ),
      new SpriteComponent(sprite),
      new ScaleComponent(0.1, 0.1),
    ]);

    const iterations = 10000;

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      entity.getComponent(PositionComponent.symbol);
    }

    const total = performance.now() - start;

    console.log('Single call:', total / iterations, 'ms');

    entities.push(entity);
  }

  return entities;
};
