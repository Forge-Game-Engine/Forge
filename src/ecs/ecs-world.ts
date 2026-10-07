import { ComponentKey, TagKey } from './ecs-component.js';
import { createSystemGroup, EcsSystemGroup } from './ecs-system-group.js';
import { Stoppable, Updatable } from '../common/index.js';
import { DirectedAcyclicGraph, SparseSet } from '../utilities/index.js';
import { ParameterizedForgeEvent } from '../events/parameterized-forge-event.js';
import { EcsSystem } from './ecs-system.js';
import { entityGeneration, entityIndex, formatEntity } from './entity.js';
import { createEntityHandle, maxEntities } from './entity-layout.js';
import { ParentEcsComponent, parentId } from './hierarchy.js';
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

const noChildren: readonly number[] = Object.freeze([]);

// Only `setParent`/`removeParent` may write the parent component, so the
// children index can't go stale.
const isParentKey = (key: symbol): boolean => key === parentId;

export class EcsWorld implements Updatable, Stoppable {
  /**
   * Raised by `removeEntity` with the removed entity, once its components
   * and tags are gone. The entity is no longer alive by then, so removing it
   * again from a listener does nothing.
   */
  public readonly onEntityRemoved: ParameterizedForgeEvent<number>;

  private readonly _componentSets: Map<symbol, SparseSet<unknown>>;

  // Each parent's children, in sibling order. The reverse direction (each
  // child's parent) is the child's `ParentEcsComponent`.
  private readonly _childrenByParent: Map<number, number[]> = new Map();

  // The handle of the entity in each slot, or -1 while the slot is free.
  private readonly _liveHandles: number[] = [];

  // The handles free slots will be reused with (their next generation), in
  // the order the slots were freed. Read from `_freeHandlesHead` onwards, so
  // the least recently freed slot is reused first and no single slot's
  // generation climbs much faster than the rest.
  private readonly _freeHandles: number[] = [];
  private _freeHandlesHead = 0;

  // The creation sequence of the entity in each slot. Handles are reused,
  // so they can't tell which of two entities was created first; this can.
  private readonly _creationSequences: number[] = [];
  private _nextCreationSequence = 0;
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
   * other groups are ordered. Game state transitions run in it. Ordering a
   * group `before` it throws.
   *
   * A group ordered `after` it, or after another group ordered that way, is
   * a start-of-tick group: it runs before every other group, including
   * groups registered later. A game state's exit and enter groups are
   * start-of-tick groups.
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

  /**
   * Creates an entity. It stays alive, with or without components, until
   * `removeEntity` removes it.
   * @returns The new entity's handle.
   * @throws An error if the world already holds the maximum number of
   * entities.
   */
  public createEntity(): number {
    if (this._freeHandlesHead < this._freeHandles.length) {
      const entity = this._freeHandles[this._freeHandlesHead];
      this._freeHandlesHead += 1;
      this._compactFreeHandles();
      this._liveHandles[entityIndex(entity)] = entity;
      this._creationSequences[entityIndex(entity)] = this
        ._nextCreationSequence++;

      return entity;
    }

    const index = this._liveHandles.length;

    if (index >= maxEntities) {
      throw new Error(
        `Unable to create an entity, the world already holds the maximum of ${maxEntities} entities.`,
      );
    }

    const entity = createEntityHandle(index, 0);
    this._liveHandles.push(entity);
    this._creationSequences.push(this._nextCreationSequence++);

    return entity;
  }

  /**
   * Reads where an entity comes in the order entities were created in: an
   * entity created later has a higher sequence number, even when it reuses a
   * removed entity's slot. Root entities draw in this order.
   * @param entity - The entity.
   * @returns Its creation sequence number.
   * @throws An error if the entity isn't alive.
   */
  public getCreationSequence(entity: number): number {
    this._requireAliveFor(entity, 'read the creation sequence of');

    return this._creationSequences[entityIndex(entity)];
  }

  /**
   * Whether `entity` was created by this world and hasn't been removed
   * since. A handle to a removed entity stays not alive even once a new
   * entity has reused its slot.
   * @param entity - The entity handle.
   * @returns `true` if the entity is alive.
   */
  public isAlive(entity: number): boolean {
    return entity >= 0 && this._liveHandles[entityIndex(entity)] === entity;
  }

  /**
   * Removes an entity, its descendants, and all of their components and
   * tags. Children are removed first, depth first and in sibling order, so
   * `onEntityRemoved` is raised for every descendant before the entity
   * itself. Does nothing if the entity isn't alive, e.g. it was already
   * removed earlier this tick.
   *
   * The entity stops being alive before its children are removed, but keeps
   * its components until they're gone, so an `onEntityRemoved` listener for
   * a descendant can still read its ancestors' components. To keep a child,
   * call `removeParent` (or `setParent` with another parent) first.
   * @param entity - The entity to remove.
   * @returns `true` if the entity was removed, `false` if it wasn't alive.
   */
  public removeEntity(entity: number): boolean {
    if (!this.isAlive(entity)) {
      return false;
    }

    const index = entityIndex(entity);

    // Dead before its children, components and event go, so removing it
    // again from anywhere in between does nothing rather than freeing the
    // slot twice, and nothing can be parented to it meanwhile.
    this._liveHandles[index] = -1;

    this._removeChildren(entity);
    this._detachFromParent(entity);

    for (const componentSet of this._componentSets.values()) {
      componentSet.remove(entity);
    }

    // Queued before the event, so a listener that throws can't leak the
    // slot. The slot's next handle is a new generation, so reusing it from a
    // listener can't be mistaken for this entity.
    this._freeHandles.push(
      createEntityHandle(index, entityGeneration(entity) + 1),
    );
    this.onEntityRemoved.raise(entity);

    return true;
  }

  /**
   * Makes `child` a child of `parent`, replacing any parent it has: it's
   * appended to `parent`'s children, removed along with `parent`, and its
   * transform follows `parent`'s. Its local transform is kept as it is, so
   * it takes the same offset under its new parent. Setting its current
   * parent again does nothing, and keeps its place among its siblings.
   * @param child - The entity to parent.
   * @param parent - Its new parent.
   * @throws An error if either entity isn't alive, or if `parent` is `child`
   * or one of its descendants.
   */
  public setParent(child: number, parent: number): void {
    this._requireAliveFor(child, 'set the parent of');
    this._requireAliveFor(parent, `parent ${formatEntity(child)} to`);

    if (this.getParent(child) === parent) {
      return;
    }

    for (
      let ancestor: number | null = parent;
      ancestor !== null;
      ancestor = this.getParent(ancestor)
    ) {
      if (ancestor === child) {
        throw new Error(
          `Unable to parent entity ${formatEntity(child)} to ${formatEntity(parent)}, ${formatEntity(parent)} is ${formatEntity(child)} itself or one of its descendants.`,
        );
      }
    }

    this._detachFromParent(child);

    let siblings = this._childrenByParent.get(parent);

    if (!siblings) {
      siblings = [];
      this._childrenByParent.set(parent, siblings);
    }

    siblings.push(child);

    const component: ParentEcsComponent = { parent };
    this._getComponentOrCreateSetByKey<ParentEcsComponent>(parentId).add(
      child,
      component,
    );
  }

  /**
   * Makes `child` a root entity again. Its local transform is kept as it
   * is, so it's now relative to the world. Does nothing if it has no parent.
   * @param child - The entity to unparent.
   */
  public removeParent(child: number): void {
    this._detachFromParent(child);
    this._componentSets.get(parentId)?.remove(child);
  }

  /**
   * Reads an entity's parent.
   * @param child - The entity.
   * @returns Its parent, or `null` if it's a root entity or isn't alive.
   */
  public getParent(child: number): number | null {
    return this.getComponent(child, parentId)?.parent ?? null;
  }

  /**
   * Reads an entity's children, in sibling order: the order they were
   * parented to it in. Removing a child, or moving it to another parent,
   * keeps its siblings in order.
   * @param parent - The entity.
   * @returns A read-only view of the world's own list, which changes as
   * children are added or removed, so copy it before removing or reparenting
   * children in a loop. Empty if the entity has no children.
   */
  public getChildren(parent: number): readonly number[] {
    return this._childrenByParent.get(parent) ?? noChildren;
  }

  /**
   * Adds a component to an entity, replacing any it already has for
   * `componentKey`.
   * @param entity - The entity to add the component to.
   * @param componentKey - The component's key.
   * @param componentData - The component.
   * @returns `componentData`.
   * @throws An error if `entity` isn't alive, or if `componentKey` is
   * `parentId` (use `setParent`).
   */
  public addComponent<T>(
    entity: number,
    componentKey: ComponentKey<T>,
    componentData: T,
  ): T {
    if (isParentKey(componentKey)) {
      throw new Error(
        `Unable to add a ParentEcsComponent to entity ${formatEntity(entity)} with addComponent, use setParent so the world's children index stays in step.`,
      );
    }

    this._requireAlive(entity, componentKey, 'component');

    const componentSet = this._getComponentOrCreateSetByKey(componentKey);
    componentSet.add(entity, componentData);

    return componentData;
  }

  /**
   * Adds a tag to an entity.
   * @param entity - The entity to tag.
   * @param tagKey - The tag's key.
   * @throws An error if `entity` isn't alive.
   */
  public addTag(entity: number, tagKey: TagKey): void {
    this._requireAlive(entity, tagKey, 'tag');

    const componentSet = this._getComponentOrCreateSetByKey(tagKey, true);
    componentSet.add(entity, true);
  }

  /**
   * Reads one of an entity's components.
   * @param entity - The entity to read the component from.
   * @param componentKey - The component's key.
   * @returns The component, or `null` if the entity doesn't have one for
   * `componentKey` or isn't alive.
   */
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
        `Required component "${componentKey.toString()}" not found on entity ${formatEntity(entity)}.`,
      );
    }

    return component;
  }

  /**
   * Removes one of an entity's components. The entity stays alive, whether
   * or not it has any components left; remove it with `removeEntity`. Does
   * nothing if the entity doesn't have the component or isn't alive.
   * @param entity - The entity to remove the component from.
   * @param componentKey - The component's key.
   * @throws An error if `componentKey` is `parentId` (use `removeParent`).
   */
  public removeComponent<T>(
    entity: number,
    componentKey: ComponentKey<T>,
  ): void {
    if (isParentKey(componentKey)) {
      throw new Error(
        `Unable to remove the ParentEcsComponent of entity ${formatEntity(entity)} with removeComponent, use removeParent so the world's children index stays in step.`,
      );
    }

    this._componentSets.get(componentKey)?.remove(entity);
  }

  private _requireAlive(
    entity: number,
    key: symbol,
    kind: 'component' | 'tag',
  ): void {
    if (!this.isAlive(entity)) {
      throw new Error(
        `Unable to add ${kind} "${key.toString()}" to entity ${formatEntity(entity)}, it isn't alive: it was removed, or wasn't created by this world.`,
      );
    }
  }

  private _requireAliveFor(entity: number, action: string): void {
    if (!this.isAlive(entity)) {
      throw new Error(
        `Unable to ${action} entity ${formatEntity(entity)}, it isn't alive: it was removed, or wasn't created by this world.`,
      );
    }
  }

  // Removes a dying entity's children, in sibling order. Iterates a copy:
  // a listener for an earlier child's removal can reparent or unparent a
  // later one, which then isn't removed.
  private _removeChildren(entity: number): void {
    const children = this._childrenByParent.get(entity);

    if (!children) {
      return;
    }

    for (const child of [...children]) {
      if (this.getParent(child) === entity) {
        this.removeEntity(child);
      }
    }

    this._childrenByParent.delete(entity);
  }

  // Takes `child` out of its parent's children, keeping the siblings'
  // order. A parent that's being removed drops its whole list once its
  // children are gone, so it's skipped here rather than spliced one child
  // at a time.
  private _detachFromParent(child: number): void {
    const parent = this.getParent(child);

    if (parent === null || !this.isAlive(parent)) {
      return;
    }

    const siblings = this._childrenByParent.get(parent);

    if (!siblings) {
      return;
    }

    siblings.splice(siblings.indexOf(child), 1);

    if (siblings.length === 0) {
      this._childrenByParent.delete(parent);
    }
  }

  // Drops the free handles already reused once they make up half the
  // queue, so it doesn't grow forever while entities are being created and
  // removed every frame.
  private _compactFreeHandles(): void {
    if (this._freeHandlesHead * 2 < this._freeHandles.length) {
      return;
    }

    this._freeHandles.splice(0, this._freeHandlesHead);
    this._freeHandlesHead = 0;
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
}
