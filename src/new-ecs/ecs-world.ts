import { Updatable } from '../common/index.js';
import { SortedSet, SparseSet } from '../utilities/index.js';
import { ComponentKey, TagKey } from './ecs-component.js';
import { EcsSystem, SystemRegistrationOrder } from './ecs-system.js';

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

  private readonly _systems: SortedSet<EcsSystem<unknown[], unknown>>;

  constructor() {
    this._componentSets = new Map();
    this._systems = new SortedSet();
  }

  public addSystem<T extends unknown[], K>(
    system: EcsSystem<T, K>,
    registrationOrder: number = SystemRegistrationOrder.normal,
  ): void {
    this._systems.add(system, registrationOrder);
  }

  public removeSystem(system: EcsSystem): void {
    this._systems.delete(system);
  }

  public update(): void {
    for (const system of this._systems) {
      const beforeQueryResult = system.beforeQuery?.(this);

      this.operate(system, beforeQueryResult);
    }
  }

  public addComponent<T>(
    entity: number,
    componentKey: ComponentKey<T>,
    componentData: T,
  ): T {
    const componentSet = this._getComponentOrCreateSetByKey(componentKey);

    componentSet.add(entity, componentData);

    return componentData;
  }

  public addTag(entity: number, tagKey: TagKey): void {
    const componentSet = this._getComponentOrCreateSetByKey(tagKey, true);

    componentSet.add(entity, true);
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
    const id = this._generateEntityId();

    return id;
  }

  public removeEntity(entity: number): void {
    for (const componentSet of this._componentSets.values()) {
      componentSet.remove(entity);
    }

    this._freeEntityIds.push(entity);
  }

  public operate(
    system: EcsSystem<unknown[], unknown>,
    beforeQueryResult?: unknown,
  ): void {
    const driver = this._getDriverComponentSet(system.query);

    if (!driver) {
      return;
    }

    for (let i = 0; i < driver.size; i++) {
      const entity = driver.denseEntities[i];
      let hasAll = true;

      this._queryResultBuffer.components.length = 0;

      for (const name of system.query) {
        const set = this._componentSets.get(name);

        if (!set?.has(entity)) {
          hasAll = false;

          break;
        }

        if (!set.isTag) {
          this._queryResultBuffer.components.push(set.get(entity));
        }
      }

      if (hasAll) {
        this._queryResultBuffer.entity = entity;
        system.run(this._queryResultBuffer, this, beforeQueryResult);
      }
    }
  }

  public queryEntities(componentNames: symbol[], out: number[]): void {
    out.length = 0;

    const driver = this._getDriverComponentSet(componentNames);

    if (!driver) {
      return;
    }

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

  private _getComponentOrCreateSetByKey<T>(
    key: symbol,
    isTag: boolean = false,
  ): SparseSet<T> {
    let componentSet = this._componentSets.get(key);

    if (!componentSet) {
      componentSet = new SparseSet<T>(isTag);
      this._componentSets.set(key, componentSet);
    }

    return componentSet as SparseSet<T>;
  }

  private _generateEntityId(): number {
    if (this._freeEntityIds.length > 0) {
      return this._freeEntityIds.pop() as number;
    }

    const id = this._nextEntityId;
    this._nextEntityId += 1;

    return id;
  }

  private _getDriverComponentSet(
    componentNames: symbol[],
  ): SparseSet<unknown> | null {
    if (componentNames.length === 0) {
      return null;
    }

    let driver: SparseSet<unknown> | null = this._getComponentSet(
      componentNames[0],
    );

    for (const name of componentNames) {
      const componentSet = this._getComponentSet(name);

      if (!componentSet) {
        continue;
      }

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

  private _getComponentSet(componentName: symbol): SparseSet<unknown> | null {
    const componentSet = this._componentSets.get(componentName);

    if (!componentSet) {
      return null;
    }

    return componentSet;
  }
}
