import type { Component } from './types';
import type { Query } from './types/Query';
import type { World } from './world';

/**
 * Represents an entity in the Entity-Component-System (ECS) architecture.
 * An entity is a container for components and has a unique identifier.
 */
export class Entity {
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
   * The unique identifier of the entity.
   */
  private readonly _id: number;

  /**
   * The set of components associated with this entity.
   */
  private readonly _components: Set<Component>; // TODO: replace this with a map for faster access

  /**
   * The parent entity, if any.
   */
  private _parent: Entity | null = null;

  /**
   * The child entities of this entity.
   */
  private readonly _children: Set<Entity> = new Set();

  /**
   * The counter for generating unique identifiers.
   */
  private static _idCounter: number = 0;

  /**
   * Creates a new Entity instance.
   * @param name - The name of the entity.
   * @param world - The world to which this entity belongs.
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
   * Generates a unique identifier for the entity.
   * @returns The unique identifier.
   */
  private static _generateId() {
    return Entity._idCounter++;
  }

  /**
   * Gets the unique identifier of the entity.
   */
  get id() {
    return this._id;
  }

  /**
   * Sets the parent of the entity.
   * @param parent - The parent entity.
   */
  public parentTo(parent: Entity) {
    if (this._parent) {
      this._parent._children.delete(this);
    }

    this._parent = parent;
    parent._children.add(this);
  }

  public removeParent() {
    if (this._parent) {
      this._parent._children.delete(this);
      this._parent = null;
    }
  }

  /**
   * Gets the parent of the entity.
   * @returns The parent entity, or null if there is no parent.
   */
  get parent() {
    return this._parent;
  }

  /**
   * Gets the child entities of this entity.
   * @returns A set of child entities.
   */
  get children() {
    return this._children;
  }

  /**
   * Adds components to the entity.
   * @param components - The components to add.
   */
  public addComponents(...components: Component[]) {
    for (const component of components) {
      this._components.add(component);
      this.world.updateSystemEntities(this);
    }
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
  public getComponent<T extends Component>(componentName: symbol): T | null {
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
   * Removes components from the entity.
   * @param componentNames - The name of the components to remove.
   */
  public removeComponents(...componentNames: symbol[]) {
    for (const componentName of componentNames) {
      const component = this.getComponent<Component>(componentName);

      if (component === null) {
        continue;
      }

      this._components.delete(component);
    }

    this.world.updateSystemEntities(this);
  }
}
