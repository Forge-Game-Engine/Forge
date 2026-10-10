import { entityIndex } from '../ecs/entity.js';

/**
 * A sparse set implementation for efficient storage of components in an ECS architecture.
 * The sparse array is indexed by each entity handle's slot index, and the dense
 * array holds full handles, so a handle to a removed entity (same slot, older
 * generation) is never a member, even once a new entity has taken its slot.
 */
export class SparseSet<T> {
  public readonly sparseArray: Array<number>;
  public readonly denseEntities: Array<number>;
  public readonly denseComponents: Array<T>;

  /**
   * Creates an empty SparseSet.
   */
  constructor() {
    this.sparseArray = [];
    this.denseEntities = [];
    this.denseComponents = [];
  }

  /**
   * Checks if the set contains a component for the specified entity.
   * @param entity - The entity handle to check.
   * @returns True if the entity has a component in the set, false otherwise.
   */
  public has(entity: number): boolean {
    const index = this.sparseArray[entityIndex(entity)];

    return (
      index != undefined && index !== -1 && this.denseEntities[index] === entity
    );
  }

  /**
   * Gets the component for the specified entity.
   * @param entity - The entity handle to get the component for.
   * @returns The component if the entity has one in the set, null otherwise.
   */
  public get(entity: number): T | null {
    return this.has(entity)
      ? this.denseComponents[this.sparseArray[entityIndex(entity)]]
      : null;
  }

  /**
   * Adds a component for the specified entity.
   * @param entity - The entity handle to add the component for.
   * @param component - The component to add.
   */
  public add(entity: number, component: T): void {
    if (this.has(entity)) {
      this.denseComponents[this.sparseArray[entityIndex(entity)]] = component;

      return;
    }

    const index = this.denseEntities.length;
    this.denseEntities.push(entity);
    this.denseComponents.push(component);
    this.sparseArray[entityIndex(entity)] = index;
  }

  /**
   * Removes the component for the specified entity.
   * @param entity - The entity handle to remove the component for.
   */
  public remove(entity: number): void {
    if (!this.has(entity)) {
      return;
    }

    const index = this.sparseArray[entityIndex(entity)];
    const lastIndex = this.denseEntities.length - 1;
    const lastEntity = this.denseEntities[lastIndex];

    this.denseEntities[index] = lastEntity;
    this.denseComponents[index] = this.denseComponents[lastIndex];
    this.sparseArray[entityIndex(lastEntity)] = index;

    this.denseEntities.pop();
    this.denseComponents.pop();
    this.sparseArray[entityIndex(entity)] = -1;
  }

  get size(): number {
    return this.denseEntities.length;
  }
}
