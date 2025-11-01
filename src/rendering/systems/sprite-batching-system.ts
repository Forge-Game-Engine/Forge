import { PositionComponent } from '../../common/index.js';
import { Entity, System } from '../../ecs/index.js';
import {
  RenderableBatchComponent,
  SpriteComponent,
} from '../components/index.js';

/**
 * The `SpriteBatchingSystem` class extends the `System` class and manages the batching of sprites.
 */
export class SpriteBatchingSystem extends System {
  private readonly _spriteBatch: RenderableBatchComponent;

  constructor(batchName: string, batcherEntity: Entity) {
    super(`${batchName}-sprite-batching`, [
      PositionComponent.symbol,
      SpriteComponent.symbol,
    ]);

    this._spriteBatch =
      batcherEntity.getComponentRequired<RenderableBatchComponent>(
        RenderableBatchComponent.symbol,
      );
  }

  public override beforeAll(entities: Entity[]): Entity[] {
    this._spriteBatch.batches.clear();

    return entities;
  }

  /**
   * Runs the batching system for the given entity, batching the sprite.
   * @param entity - The entity.
   */
  public run(entity: Entity): void {
    const spriteComponent = entity.getComponentRequired<SpriteComponent>(
      SpriteComponent.symbol,
    );

    if (
      !spriteComponent.enabled ||
      spriteComponent.sprite.renderLayer !== this._spriteBatch.renderLayer
    ) {
      return;
    }

    const { renderable } = spriteComponent.sprite;

    if (!this._spriteBatch.batches.has(renderable)) {
      this._spriteBatch.batches.set(renderable, {
        entities: [],
        instanceData: null, // This will be set later when we create the instance data.
      });
    }

    this._spriteBatch.batches.get(renderable)!.entities.push(entity);
  }
}
