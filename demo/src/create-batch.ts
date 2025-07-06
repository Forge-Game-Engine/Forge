import {
  createImageSprite,
  Entity,
  ForgeRenderLayer,
  ImageCache,
  PositionComponent,
  Random,
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
        random.randomFloat(-5000, 5000),
        random.randomFloat(-5000, 5000),
      ),
      new SpriteComponent(sprite),
    ]);

    entities.push(entity);
  }

  return entities;
};
