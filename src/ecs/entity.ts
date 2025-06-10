import type { OrNull } from '../common';
import type { Component } from './types';
import type { Query } from './types/Query';
import type { World } from './world';

/**
 * Represents an entity in the Entity-Component-System (ECS) architecture.
 * An entity is a container for components and has a unique identifier.
 */
export class Entity {
  /**
   * The unique identifier of the entity.
   */
  private readonly _id: number;

  /**
   * The set of components associated with this entity.
   */
  private readonly _components: Set<Component>;

  /**
   * The name of the entity.
   */
  public name: string;

  /**
   * Indicates whether the entity is enabled.
   */
  public enabled: boolean;

  /**
   * The world to which this entity belongs.
   */
  public world: World;

  /**
   * Creates a new Entity instance.
   * @param name - The name of the entity.
   * @param initialComponents - The initial components to associate with the entity.
   * @param enabled - Indicates whether the entity is enabled. Defaults to true.
   */
  constructor(
    name: string,
    world: World,
    initialComponents: Component[],
    enabled: boolean = true,
  ) {
    this._id = Entity._generateId();
    this._components = new Set<Component>(initialComponents);
    this.name = name;
    this.world = world;
    this.enabled = enabled;
  }

  /**
   * Gets the unique identifier of the entity.
   */
  get id() {
    return this._id;
  }

  /**
   * Adds a component to the entity.
   * @param component - The component to add.
   */
  public addComponent(component: Component) {
    this._components.add(component);
    this.world.updateSystemEntities(this);
  }

  /**
   * Checks if the entity contains all specified components.
   * @param query - The symbols of the components to check.
   * @returns True if the entity contains all specified components, otherwise false.
   */
  public containsAllComponents(query: Query) {
    let allSymbolsMatch = true;

    for (const symbol of query) {
      let symbolMatched = false;

      for (const component of this._components) {
        if (component.name === symbol) {
          symbolMatched = true;

          break;
        }
      }

      if (!symbolMatched) {
        allSymbolsMatch = false;

        break;
      }
    }

    return allSymbolsMatch;
  }

  /**
   * Gets a component by its name.
   * @param componentName - The name of the component to get.
   * @returns The component if found, otherwise null.
   */
  public getComponent<T extends Component>(componentName: symbol): OrNull<T> {
    for (const component of this._components) {
      if (component.name === componentName) {
        return component as T;
      }
    }

    return null;
  }

  /**
   * Gets a component by its name.
   * @param componentName - The name of the component to get.
   * @returns The component if found.
   * @throws An error if the component is not found.
   */
  public getComponentRequired<T extends Component>(componentName: symbol): T {
    const component = this.getComponent<T>(componentName);

    if (component === null) {
      throw new Error(
        `Tried to get required component "${componentName.toString()}" but it is null on the entity "${this.name}"`,
      );
    }

    return component;
  }

  /**
   * Removes a component from the entity.
   * @param componentName - The name of the component to remove.
   */
  public removeComponent(componentName: symbol) {
    const component = this.getComponent<Component>(componentName);

    if (component === null) {
      return;
    }

    this._components.delete(component);

    this.world.updateSystemEntities(this);
  }

  /**
   * Generates a unique identifier for the entity.
   * @returns The unique identifier.
   */
  private static _generateId() {
    return Entity._idCounter++;
  }

  /**
   * The counter for generating unique identifiers.
   */
  private static _idCounter: number = 0;
}

/**
 * Filters entities by the specified components.
 * @param entities - The set of entities to filter.
 * @param query - The symbols of the components to filter by.
 * @returns An array of entities that contain all specified components.
 */
export const filterEntitiesByComponents = (
  entities: Set<Entity>,
  query: Query,
): Set<Entity> => {
  // TODO: performance - cache these look ups if possible

  const result = new Set<Entity>();

  for (const entity of entities) {
    if (entity.containsAllComponents(query)) {
      result.add(entity);
    }
  }

  return result;
};

/**
 * Gets components from entities by their name.
 * @param name - The name of the component to get.
 * @param entities - The entities to get the components from.
 * @returns An array of components.
 */
export const getComponentsFromEntities = <T extends Component>(
  name: symbol,
  entities: Entity[],
): OrNull<T>[] => {
  const components = entities.map((entity) => entity.getComponent<T>(name));

  return components;
};
