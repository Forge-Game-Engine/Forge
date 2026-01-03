import { ForgeEvent } from '../events/forge-event.js';
import { Component, ComponentCtor } from './types/index.js';
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
   * The name of the entity.
   */
  name?: string;

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
   * Event triggered when the entity is removed from the world.
   */
  public onRemovedFromWorld: ForgeEvent;

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
   * @param world - The world to which this entity belongs.
   * @param initialComponents - The initial components to associate with the entity.
   * @param options - Optional configuration for the entity.
   */
  constructor(
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
      initialComponents.map((component) => [
        (component.constructor as ComponentCtor).id,
        component,
      ]),
    );
    this.world = world;
    this.onRemovedFromWorld = new ForgeEvent('entityRemovedFromWorld');
    this.enabled = mergedOptions.enabled;
    this.name = mergedOptions.name ?? '[anonymous entity]';

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
      const type = component.constructor as ComponentCtor;
      const key = type.id;

      if (this._components.has(key)) {
        throw new Error(
          `Unable to add component "${key.toString()}" to entity "${this.name}", it already exists on the entity.`,
        );
      }

      this._components.set(key, component);
      this.world.updateSystemEntities(this);
    }
  }

  /**
   * Checks if the entity contains all specified components.
   * @param query - The types of the components to check.
   * @returns True if the entity contains all specified components, otherwise false.
   */
  public containsAllComponents(query: Query): boolean {
    for (const ComponentType of query) {
      if (!this._components.has(ComponentType.id)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets a component by its name.
   * @param componentType - The type of the component to get.
   * @returns The component if found, otherwise null.
   */
  public getComponent<C extends ComponentCtor>(
    componentType: C,
  ): InstanceType<C> | null {
    return (this._components.get(componentType.id) as InstanceType<C>) ?? null;
  }

  /**
   * Gets a component by its name.
   * @param componentType - The type of the component to get.
   * @returns The component if found.
   * @throws An error if the component is not found.
   */
  public getComponentRequired<C extends ComponentCtor>(
    componentType: C,
  ): InstanceType<C> {
    const componentInstance = this.getComponent(componentType);

    if (componentInstance === null) {
      throw new Error(
        `Tried to get required component "${componentType.id.toString()}" but it is null on the entity "${this.name}"`,
      );
    }

    return componentInstance;
  }

  /**
   * Removes components from the entity.
   * @param componentTypes - The types of the components to remove.
   */
  public removeComponents(...componentTypes: ComponentCtor[]): void {
    for (const ComponentType of componentTypes) {
      this._components.delete(ComponentType.id);
    }

    this.world.updateSystemEntities(this);
  }
}
