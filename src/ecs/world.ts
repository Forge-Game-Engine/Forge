import { type Stoppable, Time, type Updatable } from '../common';
import { isString } from '../utilities';
import { systemRegistrationPositions } from './constants';
import { Entity } from './entity';
import type { Component, Query, System } from './types';

interface SystemOrderPair {
  system: System;
  order: number;
}

/**
 * Represents the world in the Entity-Component-System (ECS) architecture.
 * The world manages entities and systems, and updates systems with the entities they operate on.
 */
export class World implements Updatable, Stoppable {
  /**
   * The time instance for the world.
   */
  public readonly time = new Time();

  /**
   * The name of the world.
   */
  public readonly name: string;

  /**
   * A map of system names to the entities they operate on.
   */
  private readonly _systemEntities = new Map<string, Set<Entity>>();

  /**
   * A temporary array to hold enabled entities for system updates.
   */
  private readonly _enabledEntities = new Array<Entity>();

  /**
   * Callbacks to be invoked when systems change.
   */
  private readonly _onSystemsChangedCallbacks = new Set<
    (systems: Set<SystemOrderPair>) => void
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
  private readonly _systems = new Set<SystemOrderPair>();

  /**
   * The set of entities in the world.
   */
  private readonly _entities = new Set<Entity>();

  /**
   * Creates a new World instance.
   * @param name - The name of the world.
   */
  constructor(name: string) {
    this.name = name;
  }

  /**
   * Updates all systems in the world.
   */
  public update(deltaTime: number) {
    this.time.update(deltaTime);

    for (const { system } of this._systems) {
      const entities = this._systemEntities.get(system.name);

      if (!entities) {
        throw new Error(`Unable to get entities for system ${system.name}`);
      }

      this._enabledEntities.length = 0;

      for (const entity of entities) {
        if (entity.enabled) {
          this._enabledEntities.push(entity);
        }
      }

      system.runSystem(this._enabledEntities);
    }
  }

  /**
   * Gets all entities in the world that match the given query.
   * @returns An array of all entities.
   */
  public queryEntities(componentSymbols: Query): Set<Entity> {
    const entities = new Set<Entity>();

    for (const entity of this._entities) {
      if (entity.containsAllComponents(componentSymbols)) {
        entities.add(entity);
      }
    }

    return entities;
  }

  /**
   * Gets the first entity that matches the given query.
   * @param query - The query to match against the entities.
   * @returns The first matching entity, or null if no entity matches.
   */
  public queryEntity(query: Query): Entity | null {
    for (const entity of this._entities) {
      if (entity.containsAllComponents(query)) {
        return entity;
      }
    }

    return null;
  }

  /**
   * Gets the first entity that matches the given query, or throws an error if no entity matches.
   * @param query - The query to match against the entities.
   * @returns The first matching entity.
   * @throws An error if no entity matches the query.
   */
  public queryEntityRequired(query: Query): Entity {
    const entity = this.queryEntity(query);

    if (entity === null) {
      throw new Error(
        `No entity found matching the query: ${query.map((s) => s.description).join(', ')}`,
      );
    }

    return entity;
  }

  /**
   * Registers a callback to be invoked when systems change.
   * @param callback - The callback to register.
   */
  public onSystemsChanged(callback: (systems: Set<SystemOrderPair>) => void) {
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
    callback: (systems: Set<SystemOrderPair>) => void,
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
  public addSystem(
    system: System,
    order: number = systemRegistrationPositions.normal,
  ) {
    this._systems.add({ system, order });
    // Reorder the set by 'order' after adding
    const sorted = Array.from(this._systems).sort((a, b) => a.order - b.order);
    this._systems.clear();

    for (const pair of sorted) {
      this._systems.add(pair);
    }

    this._systemEntities.set(system.name, this.queryEntities(system.query));

    this.raiseOnSystemsChangedEvent();

    return this;
  }

  /**
   * Adds multiple systems to the world.
   * @param systems - The systems to add.
   * @returns The world instance.
   */
  public addSystems(order: number, ...systems: System[]): this;
  public addSystems(...systems: System[]): this;
  public addSystems(...args: [number, ...System[]] | System[]): this {
    let order: number;
    let systems: System[];

    if (typeof args[0] === 'number') {
      order = args[0];
      systems = args.slice(1) as System[];
    } else {
      order = systemRegistrationPositions.normal;
      systems = args as System[];
    }

    for (const system of systems) {
      this.addSystem(system, order);
    }

    this.raiseOnSystemsChangedEvent();

    return this;
  }

  /**
   * Removes a system from the world.
   * @param system - The system to remove.
   * @returns The world instance.
   */
  public removeSystem(systemToRemove: string | System) {
    for (const systemOrderPair of this._systems) {
      const { system } = systemOrderPair;
      const isNameMatch =
        isString(systemToRemove) && system.name === systemToRemove;
      const isSystemMatch = system === systemToRemove;

      if (isNameMatch || isSystemMatch) {
        this._systems.delete(systemOrderPair);

        this._systemEntities.delete(system.name);
        this.raiseOnSystemsChangedEvent();
      }
    }

    return this;
  }

  /**
   * Adds an entity to the world.
   * @param entity - The entity to add.
   * @returns The world instance.
   */
  public addEntity(entity: Entity) {
    this._entities.add(entity);

    this.updateSystemEntities(entity);
    this.raiseOnEntitiesChangedEvent();

    return this;
  }

  /**
   * Updates the entities in the systems based on the components of the given entity.
   * @param entity - The entity to update.
   */
  public updateSystemEntities(entity: Entity) {
    for (const { system } of this._systems) {
      const entities = this._systemEntities.get(system.name);

      if (!entities) {
        throw new Error(`Unable to get entities for system ${system.name}`);
      }

      if (entity.containsAllComponents(system.query)) {
        entities.add(entity);
      } else {
        entities.delete(entity);
      }
    }
  }

  /**
   * Builds and adds an entity to the world.
   * @param name - The name of the entity.
   * @param components - The components to add to the entity.
   * @returns The created entity.
   */
  public buildAndAddEntity(name: string, components: Component[]): Entity {
    const entity = new Entity(name, this, components);
    this.addEntity(entity);

    return entity;
  }

  /**
   * Adds multiple entities to the world.
   * @param entities - The entities to add.
   * @returns The world instance.
   */
  public addEntities(entities: Entity[]) {
    for (const entity of entities) {
      this.addEntity(entity);
    }

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

    for (const entities of this._systemEntities.values()) {
      entities.delete(entity);
    }

    this.raiseOnEntitiesChangedEvent();

    return this;
  }

  /**
   * Stops all systems in the world.
   */
  public stop() {
    for (const { system } of this._systems) {
      system.stop();
    }

    this._entities.clear();
  }
}
