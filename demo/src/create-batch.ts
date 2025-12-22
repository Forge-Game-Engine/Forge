import {
  createImageSprite,
  Entity,
  ForgeRenderLayer,
  PositionComponent,
  Random,
  ScaleComponent,
  SpriteComponent,
  World,
} from '../../src';
import { RenderContext } from '../../src/rendering/render-context';

export const createBatch = async (
  imageSrc: string,
  world: World,
  renderLayer: ForgeRenderLayer,
  renderContext: RenderContext,
  cameraEntity: Entity,
  size: number = 1000,
): Promise<Entity[]> => {
  const sprite = await createImageSprite(
    imageSrc,
    renderLayer,
    renderContext,
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

    entities.push(entity);
  }

  return entities;
};
