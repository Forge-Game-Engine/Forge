import { ComponentKey, TagKey } from '.';
import { Stoppable, Updatable } from '../common';
import { SortedSet, SparseSet } from '../utilities';
import { ParameterizedForgeEvent } from '../events/parameterized-forge-event.js';
import { EcsSystem, SystemRegistrationOrder } from './ecs-system.js';

export interface QueryResult<T extends readonly unknown[]> {
  entities: readonly number[];
  components: { [K in keyof T]: T[K][] };
}

export class EcsWorld implements Updatable, Stoppable {
  public readonly onEntityRemoved: ParameterizedForgeEvent<number>;

  private readonly _componentSets: Map<symbol, SparseSet<unknown>>;
  private readonly _freeEntityIds: number[] = [];
  private _nextEntityId = 0;
  private readonly _systems: SortedSet<EcsSystem<readonly unknown[]>>;

  constructor() {
    this.onEntityRemoved = new ParameterizedForgeEvent('entityRemoved');
    this._componentSets = new Map();
    this._systems = new SortedSet();
  }

  public stop(): void {
    for (const system of this._systems) {
      system.cleanup?.(this);
    }
  }

  public addSystem<T extends readonly unknown[]>(
    system: EcsSystem<T>,
    registrationOrder: number = SystemRegistrationOrder.normal,
  ): void {
    this._systems.add(system, registrationOrder);
    system.onRegister?.(this);
  }

  public removeSystem<T extends readonly unknown[]>(
    system: EcsSystem<T>,
  ): void {
    this._systems.delete(system);
    system.cleanup?.(this);
  }

  public update(): void {
    for (const system of this._systems) {
      const results = this.query(system.query, system.tags);
      system.update(this, results);
    }
  }

  public query<T extends readonly unknown[]>(
    componentKeys: readonly ComponentKey<unknown>[],
    tags: readonly TagKey[] = [],
  ): QueryResult<T> {
    const driver = this._getDriverComponentSet(componentKeys, tags);

    if (!driver) {
      return {
        entities: [],
        components: componentKeys.map(() => []) as unknown as {
          [K in keyof T]: T[K][];
        },
      };
    }

    const matchedEntities: number[] = [];
    const allKeys: readonly symbol[] = [...componentKeys, ...tags];

    for (let i = 0; i < driver.size; i++) {
      const entity = driver.denseEntities[i];

      if (this._entityHasAllKeys(entity, allKeys)) {
        matchedEntities.push(entity);
      }
    }

    const componentArrays = componentKeys.map((key) => {
      const set = this._componentSets.get(key)!;

      return matchedEntities.map((entity) => set.get(entity));
    });

    return {
      entities: matchedEntities,
      components: componentArrays as unknown as { [K in keyof T]: T[K][] },
    };
  }

  public createEntity(): number {
    return this._generateEntityId();
  }

  public removeEntity(entity: number): void {
    for (const componentSet of this._componentSets.values()) {
      componentSet.remove(entity);
    }

    this.onEntityRemoved.raise(entity);
    this._freeEntityIds.push(entity);
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
      SparseSet<T> | undefined;

    return componentSet?.get(entity) ?? null;
  }

  public removeComponent<T>(
    entity: number,
    componentKey: ComponentKey<T>,
  ): void {
    const componentSet = this._componentSets.get(componentKey);
    componentSet?.remove(entity);

    for (const set of this._componentSets.values()) {
      if (set.has(entity)) {
        return;
      }
    }

    this.onEntityRemoved.raise(entity);
    this._freeEntityIds.push(entity);
  }

  private _entityHasAllKeys(entity: number, keys: readonly symbol[]): boolean {
    for (const key of keys) {
      if (!this._componentSets.get(key)?.has(entity)) {
        return false;
      }
    }

    return true;
  }

  private _getDriverComponentSet(
    componentKeys: readonly ComponentKey<unknown>[],
    tags: readonly TagKey[] = [],
  ): SparseSet<unknown> | null {
    if (componentKeys.length === 0 && tags.length === 0) {
      return null;
    }

    let driver: SparseSet<unknown> | null = null;

    for (const key of componentKeys) {
      const componentSet = this._getComponentSet(key);

      if (!componentSet) {
        return null;
      }

      if (!driver || componentSet.size < driver.size) {
        driver = componentSet;
      }
    }

    for (const tagKey of tags) {
      const componentSet = this._getComponentSet(tagKey);

      if (!componentSet) {
        return null;
      }

      if (!driver || componentSet.size < driver.size) {
        driver = componentSet;
      }
    }

    return driver;
  }

  private _getComponentSet(componentName: symbol): SparseSet<unknown> | null {
    return this._componentSets.get(componentName) ?? null;
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
      return this._freeEntityIds.pop()!;
    }

    const id = this._nextEntityId;
    this._nextEntityId += 1;

    return id;
  }
}
