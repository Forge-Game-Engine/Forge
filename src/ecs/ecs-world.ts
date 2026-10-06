import { ComponentKey, TagKey } from './ecs-component.js';
import { createSystemGroup, EcsSystemGroup } from './ecs-system-group.js';
import { Stoppable, Updatable } from '../common/index.js';
import { DirectedAcyclicGraph, SparseSet } from '../utilities/index.js';
import { ParameterizedForgeEvent } from '../events/parameterized-forge-event.js';
import { EcsSystem } from './ecs-system.js';
import { RunCondition } from './run-condition.js';

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

  /**
   * Runs the system only on ticks where this returns `true`. Checked each
   * tick just before the system would run, after its group's own `runIf`.
   * A system that doesn't run isn't queried.
   */
  runIf?: RunCondition;
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

  /**
   * Runs the group's systems only on ticks where this returns `true`.
   * Checked each tick just before the group would run.
   */
  runIf?: RunCondition;
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
  private readonly _firstSystemGroup: EcsSystemGroup;
  private readonly _defaultSystemGroup: EcsSystemGroup;
  private readonly _startOfTickGroups: Set<EcsSystemGroup>;
  private readonly _restOfTickGroups: Set<EcsSystemGroup>;
  private readonly _systemRunConditions: Map<
    EcsSystem<readonly unknown[]>,
    RunCondition
  >;
  private readonly _groupRunConditions: Map<EcsSystemGroup, RunCondition>;

  constructor() {
    this.onEntityRemoved = new ParameterizedForgeEvent('entityRemoved');
    this._componentSets = new Map();
    this._systemGraphsByGroup = new Map();
    this._groupBySystem = new Map();
    this._groupGraph = new DirectedAcyclicGraph<EcsSystemGroup>(
      (group) => group.name,
    );
    this._startOfTickGroups = new Set();
    this._restOfTickGroups = new Set();
    this._systemRunConditions = new Map();
    this._groupRunConditions = new Map();

    this._firstSystemGroup = createSystemGroup('first');
    this._groupGraph.addNode(this._firstSystemGroup);
    this._startOfTickGroups.add(this._firstSystemGroup);

    this._defaultSystemGroup = createSystemGroup('default');
    this.addSystemGroup(this._defaultSystemGroup);
  }

  /**
   * The group that runs before every other group of the tick, however the
   * other groups are ordered. Game state transitions run here, so every
   * system of a tick sees the same state. Ordering a group `before` it
   * throws.
   *
   * A group ordered `after` it (or after another group that is) joins the
   * start of the tick: it runs before every group that isn't, including
   * groups added later. A game state's exit and enter groups work this way.
   */
  get firstSystemGroup(): EcsSystemGroup {
    return this._firstSystemGroup;
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
   * Registers a system group, ordering it relative to other groups. Every
   * group runs after `firstSystemGroup`. A group ordered `after` the first
   * group, or after another group that is, runs at the start of the tick,
   * before every other group.
   * @param group - The group to register.
   * @param options - `before`/`after` groups to order this group against,
   * and a `runIf` condition. Every referenced group must already be
   * registered.
   * @throws An error if `group` is the first group, if it's ordered before
   * the first group, if a start-of-tick group is ordered after a group
   * that isn't, or if a group that isn't is ordered before one that is.
   */
  public addSystemGroup(
    group: EcsSystemGroup,
    options: AddSystemGroupOptions = {},
  ): void {
    const { before = [], after = [], runIf } = options;

    if (group === this._firstSystemGroup) {
      throw new Error(
        `Unable to add system group "${group.name}", it's the world's built-in first group.`,
      );
    }

    if (before.includes(this._firstSystemGroup)) {
      throw new Error(
        `Unable to order system group "${group.name}" before the first group, every group runs after it.`,
      );
    }

    // A registered group keeps its place in the tick; a new one joins the
    // start of the tick when it's ordered after a group that's there.
    const isStartOfTick = this._groupGraph.has(group)
      ? this._startOfTickGroups.has(group)
      : after.some((afterGroup) => this._startOfTickGroups.has(afterGroup));

    this._requireTickPosition(group, isStartOfTick, before, after);

    this._groupGraph.addNode(group);

    for (const beforeGroup of before) {
      this._groupGraph.addEdge(group, beforeGroup);
    }

    for (const afterGroup of after) {
      this._groupGraph.addEdge(afterGroup, group);
    }

    this._placeGroupInTick(group, isStartOfTick);

    if (runIf) {
      this._groupRunConditions.set(group, runIf);
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
      runIf,
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

    if (runIf) {
      this._systemRunConditions.set(system, runIf);
    }

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

    this._systemRunConditions.delete(system);

    system.cleanup?.(this);
  }

  /**
   * Runs one tick: every group in order, and every system of each group in
   * order. A group or system whose `runIf` returns `false` is skipped
   * without being queried. Conditions are checked just before the group or
   * system would run, so they see what earlier systems of the tick did.
   */
  public update(): void {
    for (const { group, systems } of this._getOrderedGroups()) {
      if (!this._shouldRun(this._groupRunConditions.get(group))) {
        continue;
      }

      for (const system of systems) {
        if (!this._shouldRun(this._systemRunConditions.get(system))) {
          continue;
        }

        const results = this.query(system.query, system.tags);
        system.update(this, results);
      }
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

  /**
   * Returns a fast accessor for a single component type, resolving its
   * underlying storage once instead of on every call - useful when a
   * system needs to look up the same optional component (one not every
   * entity has, so it can't just be added to `query`'s required keys) for
   * many entities in a tight loop. `getComponent` re-resolves `componentKey`
   * to its storage on every single call; this instead does that resolution
   * once and returns a function that goes straight to the resolved storage.
   * @param componentKey - The component's key.
   * @returns A function mapping an entity to its component for
   * `componentKey`, or `null` if that entity doesn't have one. Reflects
   * components added to `componentKey` after this call, as long as at
   * least one entity in the world already had `componentKey` at the time
   * this was called - so call it fresh (e.g. once per system update) rather
   * than caching it across ticks of a world that might not have used
   * `componentKey` yet on the first call.
   */
  public getComponentAccessor<T>(
    componentKey: ComponentKey<T>,
  ): (entity: number) => T | null {
    const componentSet = this._componentSets.get(componentKey) as
      SparseSet<T> | undefined;

    if (!componentSet) {
      return () => null;
    }

    return (entity: number) => componentSet.get(entity);
  }

  /**
   * Reads a component the caller expects to already exist, throwing instead
   * of returning `null` if it doesn't - for the common case of re-reading a
   * component this same call site just attached, where a `null` would mean a
   * broken invariant rather than a legitimate "doesn't have it" case.
   * @param entity - The entity to read the component from.
   * @param componentKey - The component's key.
   * @returns The component.
   * @throws An error if `entity` doesn't have a component for `componentKey`.
   */
  public getComponentRequired<T>(
    entity: number,
    componentKey: ComponentKey<T>,
  ): T {
    const component = this.getComponent(entity, componentKey);

    if (component === null) {
      throw new Error(
        `Required component "${componentKey.toString()}" not found on entity "${entity}".`,
      );
    }

    return component;
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

  private _getOrderedGroups(): {
    group: EcsSystemGroup;
    systems: EcsSystem<readonly unknown[]>[];
  }[] {
    return this._groupGraph.topologicalSort().map((group) => ({
      group,
      systems: this._systemGraphsByGroup.get(group)?.topologicalSort() ?? [],
    }));
  }

  private _getOrderedSystems(): EcsSystem<readonly unknown[]>[] {
    return this._getOrderedGroups().flatMap(({ systems }) => systems);
  }

  private _shouldRun(runIf: RunCondition | undefined): boolean {
    return runIf === undefined || runIf(this);
  }

  private _requireTickPosition(
    group: EcsSystemGroup,
    isStartOfTick: boolean,
    before: readonly EcsSystemGroup[],
    after: readonly EcsSystemGroup[],
  ): void {
    if (isStartOfTick) {
      const laterGroup = after.find(
        (afterGroup) => !this._startOfTickGroups.has(afterGroup),
      );

      if (laterGroup) {
        throw new Error(
          `Unable to order system group "${group.name}" after "${laterGroup.name}", "${group.name}" runs at the start of the tick (after the first group) and "${laterGroup.name}" doesn't.`,
        );
      }

      return;
    }

    const earlierGroup = before.find((beforeGroup) =>
      this._startOfTickGroups.has(beforeGroup),
    );

    if (earlierGroup) {
      throw new Error(
        `Unable to order system group "${group.name}" before "${earlierGroup.name}", "${earlierGroup.name}" runs at the start of the tick (after the first group) and "${group.name}" doesn't.`,
      );
    }
  }

  private _placeGroupInTick(
    group: EcsSystemGroup,
    isStartOfTick: boolean,
  ): void {
    if (isStartOfTick) {
      this._startOfTickGroups.add(group);

      for (const laterGroup of this._restOfTickGroups) {
        this._groupGraph.addEdge(group, laterGroup);
      }

      return;
    }

    this._restOfTickGroups.add(group);

    for (const earlierGroup of this._startOfTickGroups) {
      this._groupGraph.addEdge(earlierGroup, group);
    }
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
