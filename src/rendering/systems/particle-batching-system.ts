import { ParticleEmitterComponent } from '../../animations';
import { Entity, System } from '../../ecs';
import { ParticleBatchComponent } from '../components';

/**
 * The `ParticleBatchingSystem` class extends the `System` class and manages the batching of particles.
 */
export class ParticleBatchingSystem extends System {
  private readonly _particleBatch: ParticleBatchComponent;

  constructor(batcherEntity: Entity) {
    super('particle-batching', [ParticleEmitterComponent.symbol]);

    this._particleBatch =
      batcherEntity.getComponentRequired<ParticleBatchComponent>(
        ParticleBatchComponent.symbol,
      );
  }

  public override beforeAll(entities: Entity[]): Entity[] {
    this._particleBatch.batches.clear();

    return entities;
  }

  /**
   * Runs the batching system for the given entity, batching the sprite.
   * @param entity - The entity.
   */
  public run(entity: Entity): void {
    const particleEmitterComponent =
      entity.getComponentRequired<ParticleEmitterComponent>(
        ParticleEmitterComponent.symbol,
      );

    if (
      particleEmitterComponent.renderLayer !== this._particleBatch.renderLayer
    ) {
      return;
    }

    const renderable = particleEmitterComponent.renderable;

    if (!this._particleBatch.batches.has(renderable)) {
      this._particleBatch.batches.set(renderable, {
        particles: [],
        instanceData: null,
      });
    }

    this._particleBatch.batches
      .get(renderable)!
      .particles.push(...particleEmitterComponent.particles);
  }
}
