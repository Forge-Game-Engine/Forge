/**
 * A sparse set implementation for efficient storage of components in an ECS architecture.
 */
export class SparseSet<T> {
  public readonly sparseArray: Array<number>;
  public readonly denseEntities: Array<number>;
  public readonly denseComponents: Array<T>;
  public readonly isTag: boolean;

  /**
   * Creates a new SparseSet instance.
   * @param isTag - Indicates whether the set is a tag component (default: false).
   */
  constructor(isTag: boolean = false) {
    this.sparseArray = [];
    this.denseEntities = [];
    this.denseComponents = [];
    this.isTag = isTag;
  }

  /**
   * Checks if the set contains a component for the specified entity.
   * @param entity - The entity ID to check.
   * @returns True if the entity has a component in the set, false otherwise.
   */
  public has(entity: number): boolean {
    const index = this.sparseArray[entity];

    return (
      index != undefined && index !== -1 && this.denseEntities[index] === entity
    );
  }

  /**
   * Gets the component for the specified entity.
   * @param entity - The entity ID to get the component for.
   * @returns The component if the entity has one in the set, null otherwise.
   */
  public get(entity: number): T | null {
    return this.has(entity)
      ? this.denseComponents[this.sparseArray[entity]]
      : null;
  }

  /**
   * Adds a component for the specified entity.
   * @param entity - The entity ID to add the component for.
   * @param component - The component to add.
   */
  public add(entity: number, component: T): void {
    if (this.has(entity)) {
      this.denseComponents[this.sparseArray[entity]] = component;

      return;
    }

    const index = this.denseEntities.length;
    this.denseEntities.push(entity);
    this.denseComponents.push(component);
    this.sparseArray[entity] = index;
  }

  /**
   * Removes the component for the specified entity.
   * @param entity - The entity ID to remove the component for.
   */
  public remove(entity: number): void {
    if (!this.has(entity)) {
      return;
    }

    const index = this.sparseArray[entity];
    const lastIndex = this.denseEntities.length - 1;
    const lastEntity = this.denseEntities[lastIndex];

    this.denseEntities[index] = lastEntity;
    this.denseComponents[index] = this.denseComponents[lastIndex];
    this.sparseArray[lastEntity] = index;

    this.denseEntities.pop();
    this.denseComponents.pop();
    this.sparseArray[entity] = -1;
  }

  get size(): number {
    return this.denseEntities.length;
  }
}
