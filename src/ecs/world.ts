import type { Stoppable } from '../common';
import type { Updatable } from '../game';
import { Entity } from './entity';
import type { Component, System } from './types';

/**
 * Represents the world in the Entity-Component-System (ECS) architecture.
 * The world manages entities and systems, and updates systems with the entities they operate on.
 */
export class World implements Updatable, Stoppable {
  // This could be a local variable in the update method, but for performance reasons, we keep it as a class variable.
  // This is a performance optimization to avoid creating a new array every time.
  private readonly _systemEntities = new Array<Entity>();

  /**
   * Callbacks to be invoked when systems change.
   */
  private readonly _onSystemsChangedCallbacks = new Set<
    (systems: Set<System>) => void
  >();

  /**
   * Callbacks to be invoked when entities change.
   */
  private readonly _onEntitiesChangedCallbacks = new Set<
    (entities: Set<Entity>) => void
  >();

  /**
   * The set of systems in the world.
   */
  private readonly _systems = new Set<System>();

  /**
   * The set of entities in the world.
   */
  private readonly _entities = new Set<Entity>();

  /**
   * Updates all systems in the world.
   */
  public update() {
    for (const system of this._systems) {
      this._systemEntities.length = 0;

      for (const entity of this._entities) {
        if (!entity.enabled) {
          continue;
        }

        if (entity.containsAllComponents(system.operatesOnComponents)) {
          this._systemEntities.push(entity);
        }
      }

      system.runSystem(this._systemEntities);
    }
  }

  /**
   * Registers a callback to be invoked when systems change.
   * @param callback - The callback to register.
   */
  public onSystemsChanged(callback: (systems: Set<System>) => void) {
    this._onSystemsChangedCallbacks.add(callback);
  }

  /**
   * Registers a callback to be invoked when entities change.
   * @param callback - The callback to register.
   */
  public onEntitiesChanged(callback: (entities: Set<Entity>) => void) {
    this._onEntitiesChangedCallbacks.add(callback);
  }

  /**
   * Removes a callback for systems changed events.
   * @param callback - The callback to remove.
   */
  public removeOnSystemsChangedCallback(
    callback: (systems: Set<System>) => void,
  ) {
    this._onSystemsChangedCallbacks.delete(callback);
  }

  /**
   * Removes a callback for entities changed events.
   * @param callback - The callback to remove.
   */
  public removeOnEntitiesChangedCallback(
    callback: (entities: Set<Entity>) => void,
  ) {
    this._onEntitiesChangedCallbacks.delete(callback);
  }

  /**
   * Raises the systems changed event.
   */
  public raiseOnSystemsChangedEvent() {
    for (const callback of this._onSystemsChangedCallbacks) {
      callback(this._systems);
    }
  }

  /**
   * Raises the entities changed event.
   */
  public raiseOnEntitiesChangedEvent() {
    for (const callback of this._onEntitiesChangedCallbacks) {
      callback(this._entities);
    }
  }

  /**
   * Adds a system to the world.
   * @param system - The system to add.
   * @returns The world instance.
   */
  public addSystem(system: System) {
    this._systems.add(system);

    this.raiseOnSystemsChangedEvent();

    return this;
  }

  /**
   * Adds multiple systems to the world.
   * @param systems - The systems to add.
   * @returns The world instance.
   */
  public addSystems(...systems: System[]) {
    for (const system of systems) {
      this.addSystem(system);
    }

    this.raiseOnSystemsChangedEvent();

    return this;
  }

  /**
   * Removes a system from the world.
   * @param system - The system to remove.
   * @returns The world instance.
   */
  public removeSystem(system: System) {
    this._systems.delete(system);
    this.raiseOnSystemsChangedEvent();

    return this;
  }

  /**
   * Adds an entity to the world.
   * @param entity - The entity to add.
   * @returns The world instance.
   */
  public addEntity(entity: Entity) {
    this._entities.add(entity);

    this.raiseOnEntitiesChangedEvent();

    return this;
  }

  /**
   * Builds and adds an entity to the world.
   * @param name - The name of the entity.
   * @param components - The components to add to the entity.
   * @returns The created entity.
   */
  public buildAndAddEntity(name: string, components: Component[]): Entity {
    const entity = new Entity(name, components);
    this.addEntity(entity);

    return entity;
  }

  /**
   * Adds multiple entities to the world.
   * @param entities - The entities to add.
   * @returns The world instance.
   */
  public addEntities(entities: Entity[]) {
    entities.forEach(this.addEntity);
    this.raiseOnEntitiesChangedEvent();

    return this;
  }

  /**
   * Removes an entity from the world.
   * @param entity - The entity to remove.
   * @returns The world instance.
   */
  public removeEntity(entity: Entity) {
    this._entities.delete(entity);
    this.raiseOnEntitiesChangedEvent();

    return this;
  }

  /**
   * Stops all systems in the world.
   */
  public stop() {
    for (const system of this._systems) {
      system.stop();
    }

    this._entities.clear();
  }
}
