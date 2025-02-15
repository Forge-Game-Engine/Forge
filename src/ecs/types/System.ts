import { Stoppable } from '../../common';
import { Entity } from '../entity';

/**
 * Represents a system in the Entity-Component-System (ECS) architecture.
 * A system operates on entities that contain specific components.
 * Systems are responsible for updating the state of entities.
 */
export abstract class System implements Stoppable {
  /**
   * The name of the system.
   */
  public name: string;

  /**
   * The components that this system operates on.
   */
  public operatesOnComponents: symbol[];

  /**
   * Indicates whether the system is enabled.
   */
  public isEnabled: boolean = true;

  /**
   * Creates a new System instance.
   * @param name - The name of the system.
   * @param operatesOnComponents - The components that this system operates on.
   */
  constructor(name: string, operatesOnComponents: symbol[]) {
    this.name = name;
    this.operatesOnComponents = operatesOnComponents;
  }

  /**
   * Runs the system on the provided entities.
   * @param entities - The entities to run the system on.
   */
  public runSystem(entities: Entity[]) {
    if (!this.isEnabled) {
      return;
    }

    const modifiedEntities = this.beforeAll(entities);

    for (let i = 0; i < modifiedEntities.length; i++) {
      const entity = modifiedEntities[i];

      this.run(entity);
    }
  }

  /**
   * Abstract method to run the system on a single entity.
   * Must be implemented by subclasses.
   * @param entity - The entity to run the system on.
   */
  public abstract run(entity: Entity): void;

  /**
   * Hook method that is called before running the system on all entities.
   * Can be overridden by subclasses to modify the entities before processing.
   * @param entities - The entities to be processed.
   * @returns The modified entities.
   */
  public beforeAll(entities: Entity[]) {
    return entities;
  }

  /**
   * Stops the system. This method can be overridden by subclasses.
   */
  public stop() {
    return;
  }
}
