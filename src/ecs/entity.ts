import type { Component } from './types/index.js';
import type { Query } from './types/Query.js';
import type { World } from './world.js';

/**
 * Options for configuring an Entity.
 */
export interface EntityOptions {
  /**
   * Indicates whether the entity is enabled.
   */
  enabled: boolean;

  /**
   * The optional parent entity to assign at creation.
   */
  parent?: Entity;
}

/**
 * Default options for an Entity.
 */
const defaultEntityOptions: EntityOptions = {
  enabled: true,
};

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
   * The map of components associated with this entity, keyed by component name.
   */
  private readonly _components: Map<symbol, Component>;

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
   * @param options - Optional configuration for the entity.
   */
  constructor(
    name: string,
    world: World,
    initialComponents: Component[],
    options: Partial<EntityOptions> = {},
  ) {
    const mergedOptions: EntityOptions = {
      ...defaultEntityOptions,
      ...options,
    };

    this._id = Entity._generateId();
    this._components = new Map<symbol, Component>(
      initialComponents.map((component) => [component.name, component]),
    );
    this.name = name;
    this.world = world;
    this.enabled = mergedOptions.enabled;

    if (mergedOptions.parent) {
      this.parentTo(mergedOptions.parent);
    }
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
  get id(): number {
    return this._id;
  }

  /**
   * Sets the parent of the entity.
   * @param parent - The parent entity.
   */
  public parentTo(parent: Entity): void {
    if (this._parent) {
      this._parent._children.delete(this);
    }

    this._parent = parent;
    parent._children.add(this);
  }

  /**
   * Removes the parent relationship from this entity, if it has one.
   * This will also remove this entity from its parent's set of children.
   * If the entity does not have a parent, this method does nothing.
   */
  public removeParent(): void {
    if (this._parent) {
      this._parent._children.delete(this);
      this._parent = null;
    }
  }

  /**
   * Gets the parent of the entity.
   * @returns The parent entity, or null if there is no parent.
   */
  get parent(): Entity | null {
    return this._parent;
  }

  /**
   * Gets the child entities of this entity.
   * @returns A set of child entities.
   */
  get children(): Set<Entity> {
    return new Set(this._children);
  }

  /**
   * Adds components to the entity.
   * @param components - The components to add.
   * @throws An error if a component with the same name already exists on the entity.
   */
  public addComponents(...components: Component[]): void {
    for (const component of components) {
      if (this._components.has(component.name)) {
        throw new Error(
          `Unable to add component "${component.name.toString()}" to entity "${this.name}", it already exists on the entity.`,
        );
      }

      this._components.set(component.name, component);
      this.world.updateSystemEntities(this);
    }
  }

  /**
   * Checks if the entity contains all specified components.
   * @param query - The symbols of the components to check.
   * @returns True if the entity contains all specified components, otherwise false.
   */
  public containsAllComponents(query: Query): boolean {
    for (const symbol of query) {
      if (!this._components.has(symbol)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets a component by its name.
   * @param componentName - The name of the component to get.
   * @returns The component if found, otherwise null.
   */
  public getComponent<T extends Component>(componentName: symbol): T | null {
    return (this._components.get(componentName) as T) ?? null;
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
  public removeComponents(...componentNames: symbol[]): void {
    for (const componentName of componentNames) {
      this._components.delete(componentName);
    }

    this.world.updateSystemEntities(this);
  }
}
