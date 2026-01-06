export class SparseSet<T> {
  public readonly sparseArray: Array<number>;
  public readonly denseEntities: Array<number>;
  public readonly denseComponents: Array<T>;

  constructor() {
    this.sparseArray = [];
    this.denseEntities = [];
    this.denseComponents = [];
  }

  public has(entity: number): boolean {
    const index = this.sparseArray[entity];

    return (
      index != undefined && index !== -1 && this.denseEntities[index] === entity
    );
  }

  public get(entity: number): T | null {
    return this.has(entity)
      ? this.denseComponents[this.sparseArray[entity]]
      : null;
  }

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
