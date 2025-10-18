import type { Stoppable } from 'forge/common';
import { Entity } from 'forge/ecs/entity';
import type { Query } from './Query';

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
  public query: Query;

  /**
   * Indicates whether the system is enabled.
   */
  public isEnabled: boolean = true;

  /**
   * Creates a new System instance.
   * @param name - The name of the system.
   * @param query - The components that this system operates on.
   */
  constructor(name: string, query: Query) {
    this.name = name;
    this.query = query;
  }

  /**
   * Runs the system on the provided entities.
   * @param entities - The entities to run the system on.
   */
  public runSystem(entities: Entity[]): void {
    if (!this.isEnabled) {
      return;
    }

    const modifiedEntities = this.beforeAll(entities);

    for (const entity of modifiedEntities) {
      const shouldEarlyExit = this.run(entity);

      if (shouldEarlyExit) {
        break;
      }
    }
  }

  /**
   * Abstract method to run the system on a single entity.
   * Must be implemented by subclasses.
   * @param entity - The entity to run the system on.
   * @return void | boolean - Returns void or a boolean indicating whether to exit early.
   */
  public abstract run(entity: Entity): void | boolean;

  /**
   * Hook method that is called before running the system on all entities.
   * Can be overridden by subclasses to modify the entities before processing.
   * @param entities - The entities to be processed.
   * @returns The modified entities.
   */
  public beforeAll(entities: Entity[]): Entity[] {
    return entities;
  }

  /**
   * Stops the system. This method can be overridden by subclasses.
   */
  public stop(): void {
    return;
  }
}
