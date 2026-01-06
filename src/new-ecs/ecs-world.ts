import { Updatable } from '../common';
import { SparseSet } from '../utilities/sparse-set';
import { ComponentKey } from './ecs-component';
import { EcsSystem } from './ecs-system';

export type QueryResult<T extends unknown[]> = {
  entity: number;
  components: T;
};

export class EcsWorld implements Updatable {
  private readonly _componentSets: Map<symbol, SparseSet<unknown>>;

  private readonly _freeEntityIds: number[] = [];
  private _nextEntityId = 0;

  private readonly _queryResultBuffer: QueryResult<unknown[]> = {
    entity: -1,
    components: [],
  };

  private readonly _systems: Set<EcsSystem<unknown[], unknown>>;

  constructor() {
    this._componentSets = new Map();
    this._systems = new Set<EcsSystem>();
  }

  public addSystem(system: EcsSystem): void {
    this._systems.add(system);
  }

  public removeSystem(system: EcsSystem): void {
    this._systems.delete(system);
  }

  public update(): void {
    for (const system of this._systems) {
      const beforeQueryResult = system.beforeQuery?.(this);

      this.operate(system.query, system, beforeQueryResult);
    }
  }

  public addComponent<T>(
    entity: number,
    componentKey: ComponentKey<T>,
    componentData: T,
  ): void {
    let componentSet = this._componentSets.get(componentKey);

    if (!componentSet) {
      componentSet = new SparseSet<unknown>();
      this._componentSets.set(componentKey, componentSet);
    }

    componentSet.add(entity, componentData);
  }

  public getComponent<T>(
    entity: number,
    componentKey: ComponentKey<T>,
  ): T | null {
    const componentSet = this._componentSets.get(componentKey) as
      | SparseSet<T>
      | undefined;

    return componentSet?.get(entity) ?? null;
  }

  public removeComponent<T>(
    entity: number,
    componentKey: ComponentKey<T>,
  ): void {
    const componentSet = this._componentSets.get(componentKey);

    componentSet?.remove(entity);

    for (const componentSet of this._componentSets.values()) {
      if (componentSet.has(entity)) {
        return;
      }
    }

    this._freeEntityIds.push(entity);
  }

  public createEntity(): number {
    if (this._freeEntityIds.length > 0) {
      return this._freeEntityIds.pop() as number;
    }

    const id = this._nextEntityId;
    this._nextEntityId += 1;

    return id;
  }

  public removeEntity(entity: number): void {
    for (const componentSet of this._componentSets.values()) {
      componentSet.remove(entity);
    }

    this._freeEntityIds.push(entity);
  }

  public operate(
    componentNames: symbol[],
    system: EcsSystem<unknown[], unknown>,
    beforeQueryResult?: unknown,
  ): void {
    const driver = this._getDriverComponentSet(componentNames);

    for (let i = 0; i < driver.size; i++) {
      const entity = driver.denseEntities[i];
      let hasAll = true;

      this._queryResultBuffer.components.length = 0;

      for (const name of componentNames) {
        const set = this._componentSets.get(name);

        if (!set?.has(entity)) {
          hasAll = false;

          break;
        }

        this._queryResultBuffer.components.push(set.get(entity));
      }

      if (hasAll) {
        system.run(this._queryResultBuffer, this, beforeQueryResult);
      }
    }
  }

  public queryEntities(componentNames: symbol[], out: number[]): void {
    out.length = 0;

    const driver = this._getDriverComponentSet(componentNames);

    for (let i = 0; i < driver.size; i++) {
      const entity = driver.denseEntities[i];

      let hasAllComponents = true;

      for (const name of componentNames) {
        const componentSet = this._componentSets.get(name);

        if (!componentSet?.has(entity)) {
          hasAllComponents = false;

          break;
        }
      }

      if (hasAllComponents) {
        out.push(entity);
      }
    }
  }

  private _getDriverComponentSet(componentNames: symbol[]): SparseSet<unknown> {
    if (componentNames.length === 0) {
      throw new Error('No components found for the given names.');
    }

    let driver: SparseSet<unknown> = this._getComponentSetRequired(
      componentNames[0],
    );

    for (const name of componentNames) {
      const componentSet = this._getComponentSetRequired(name);

      if (!driver) {
        driver = componentSet;

        continue;
      }

      if (componentSet.size < driver.size) {
        driver = componentSet;
      }
    }

    return driver;
  }

  private _getComponentSetRequired(componentName: symbol): SparseSet<unknown> {
    const componentSet = this._componentSets.get(componentName);

    if (!componentSet) {
      throw new Error(
        `No components found for the given name: ${componentName.toString()}.`,
      );
    }

    return componentSet;
  }
}
