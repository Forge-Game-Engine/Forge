import { ComponentKey, TagKey } from './ecs-component.js';
import { createSystemGroup, EcsSystemGroup } from './ecs-system-group.js';
import { Stoppable, Updatable } from '../common/index.js';
import { DirectedAcyclicGraph, SparseSet } from '../utilities/index.js';
import { ParameterizedForgeEvent } from '../events/parameterized-forge-event.js';
import { EcsSystem } from './ecs-system.js';

export interface QueryResult<T extends readonly unknown[]> {
  entities: readonly number[];
  components: { [K in keyof T]: T[K][] };
}

export interface AddSystemOptions {
  /**
   * Which group to register the system in. Defaults to the world's
   * `defaultSystemGroup` when omitted.
   */
  group?: EcsSystemGroup;

  /**
   * Systems that must run before this one. Every referenced system must
   * already be registered (via `addSystem`) in the same group as this one.
   */
  before?: EcsSystem[];

  /**
   * Systems that must run after this one. Every referenced system must
   * already be registered (via `addSystem`) in the same group as this one.
   */
  after?: EcsSystem[];
}

export interface AddSystemGroupOptions {
  /**
   * Groups that must run before this one. Every referenced group must
   * already be registered via `addSystemGroup`.
   */
  before?: EcsSystemGroup[];

  /**
   * Groups that must run after this one. Every referenced group must
   * already be registered via `addSystemGroup`.
   */
  after?: EcsSystemGroup[];
}

export class EcsWorld implements Updatable, Stoppable {
  public readonly onEntityRemoved: ParameterizedForgeEvent<number>;

  private readonly _componentSets: Map<symbol, SparseSet<unknown>>;
  private readonly _freeEntityIds: number[] = [];
  private _nextEntityId = 0;
  private readonly _systemGraphsByGroup: Map<
    EcsSystemGroup,
    DirectedAcyclicGraph<EcsSystem<readonly unknown[]>>
  >;
  private readonly _groupBySystem: Map<
    EcsSystem<readonly unknown[]>,
    EcsSystemGroup
  >;
  private readonly _groupGraph: DirectedAcyclicGraph<EcsSystemGroup>;
  private readonly _defaultSystemGroup: EcsSystemGroup;

  constructor() {
    this.onEntityRemoved = new ParameterizedForgeEvent('entityRemoved');
    this._componentSets = new Map();
    this._systemGraphsByGroup = new Map();
    this._groupBySystem = new Map();
    this._groupGraph = new DirectedAcyclicGraph<EcsSystemGroup>(
      (group) => group.name,
    );
    this._defaultSystemGroup = createSystemGroup('default');
    this._groupGraph.addNode(this._defaultSystemGroup);
  }

  /**
   * The system group systems are registered into when `addSystem` is called
   * without a `group` option. Order your own groups relative to it (via
   * `addSystemGroup`'s `before`/`after`) to run consistently before or after
   * every system a caller registers without specifying a group.
   */
  get defaultSystemGroup(): EcsSystemGroup {
    return this._defaultSystemGroup;
  }

  public stop(): void {
    for (const system of this._getOrderedSystems()) {
      system.cleanup?.(this);
    }
  }

  /**
   * Registers a system group, ordering it relative to other groups.
   * @param group - The group to register.
   * @param options - `before`/`after` groups to order this group against.
   * Every referenced group must already be registered.
   */
  public addSystemGroup(
    group: EcsSystemGroup,
    options: AddSystemGroupOptions = {},
  ): void {
    const { before = [], after = [] } = options;

    this._groupGraph.addNode(group);

    for (const beforeGroup of before) {
      this._groupGraph.addEdge(group, beforeGroup);
    }

    for (const afterGroup of after) {
      this._groupGraph.addEdge(afterGroup, group);
    }
  }

  /**
   * Registers a system, optionally ordering it relative to other systems in
   * its group.
   * @param system - The system to register.
   * @param options - Which group to register the system in, and `before`/
   * `after` systems (within that same group) to order it against.
   */
  public addSystem<T extends readonly unknown[]>(
    system: EcsSystem<T>,
    options: AddSystemOptions = {},
  ): void {
    const {
      group = this._defaultSystemGroup,
      before = [],
      after = [],
    } = options;

    if (!this._groupGraph.has(group)) {
      throw new Error(
        `Unable to add system "${system.name ?? 'unnamed system'}" to group "${group.name}", the group has not been registered with addSystemGroup.`,
      );
    }

    let systemGraph = this._systemGraphsByGroup.get(group);

    if (!systemGraph) {
      systemGraph = new DirectedAcyclicGraph<EcsSystem<readonly unknown[]>>(
        (otherSystem) => otherSystem.name ?? 'unnamed system',
      );
      this._systemGraphsByGroup.set(group, systemGraph);
    }

    systemGraph.addNode(system);
    this._groupBySystem.set(system, group);

    for (const beforeSystem of before) {
      this._requireSameGroup(system, beforeSystem, group);
      systemGraph.addEdge(system, beforeSystem);
    }

    for (const afterSystem of after) {
      this._requireSameGroup(system, afterSystem, group);
      systemGraph.addEdge(afterSystem, system);
    }

    system.onRegister?.(this);
  }

  public removeSystem<T extends readonly unknown[]>(
    system: EcsSystem<T>,
  ): void {
    const group = this._groupBySystem.get(system);

    if (group) {
      this._systemGraphsByGroup.get(group)?.removeNode(system);
      this._groupBySystem.delete(system);
    }

    system.cleanup?.(this);
  }

  public update(): void {
    for (const system of this._getOrderedSystems()) {
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

  private _requireSameGroup(
    system: EcsSystem<readonly unknown[]>,
    other: EcsSystem<readonly unknown[]>,
    group: EcsSystemGroup,
  ): void {
    const otherGroup = this._groupBySystem.get(other);
    const systemName = system.name ?? 'unnamed system';
    const otherName = other.name ?? 'unnamed system';

    if (!otherGroup) {
      throw new Error(
        `Unable to order system "${systemName}" relative to "${otherName}", "${otherName}" has not been registered with addSystem yet. Register it before referencing it in "before"/"after".`,
      );
    }

    if (otherGroup !== group) {
      throw new Error(
        `Unable to order system "${systemName}" relative to "${otherName}", they belong to different system groups ("${group.name}" and "${otherGroup.name}"). Order groups against each other with addSystemGroup instead.`,
      );
    }
  }

  private _getOrderedSystems(): EcsSystem<readonly unknown[]>[] {
    const orderedSystems: EcsSystem<readonly unknown[]>[] = [];

    for (const group of this._groupGraph.topologicalSort()) {
      const systemGraph = this._systemGraphsByGroup.get(group);

      if (systemGraph) {
        orderedSystems.push(...systemGraph.topologicalSort());
      }
    }

    return orderedSystems;
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
