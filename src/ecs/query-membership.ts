import { SparseSet } from '../utilities/sparse-set.js';
import { entityIndex } from './entity.js';
import { QueryResult } from './query-result.js';

// Flags on an entity in a system's result arrays, by its position there.
const removedFlag = 1;
const replacedFlag = 2;

// What `added` and `removed` are while empty (see `QueryResultState`).
const noEntities: readonly number[] = Object.freeze([]);

// The fields of a `QueryResult`, which only the world writes.
interface WritableQueryResult {
  entities: readonly number[];
  components: readonly (readonly unknown[])[];
  added: readonly number[];
  removed: readonly number[];
  lastRunTick: number;
}

// Sets an array's length, only when it changes.
const setLength = (values: unknown[], length: number): void => {
  if (values.length !== length) {
    values.length = length;
  }
};

/**
 * One system's result for one declared query: arrays the world owns, an
 * index from entity to position in them, and the journal of what changed
 * since the system last ran. The world applies the journal to the arrays
 * just before the system's `update`, so the arrays never change during it,
 * and the cost is proportional to what changed.
 *
 * Applying the journal writes every array by index, and sets each length
 * once, at the end, so an entity leaving and another entering in the same
 * run don't shrink and regrow the storage. V8 gives an array's storage back
 * when its length drops below about half of what it holds, and all of it at
 * length 0, and allocates again when the array regrows. So:
 *
 * - `added` and `removed` are a shared, frozen empty array on a run with
 *   nothing to report, and the arrays that hold them keep their storage for
 *   the next run that has something.
 * - A tick doesn't allocate while each array stays above about half of its
 *   largest size: a still scene, or churn that replaces about as many
 *   entities as it removes, run after run.
 * - When a list does shrink below that (fewer entities match, or fewer
 *   changed this run than in an earlier one), growing it back allocates,
 *   in proportion to the entities it grows by.
 */
export class QueryResultState {
  private readonly _result: WritableQueryResult;
  private readonly _entities: number[] = [];
  private readonly _components: unknown[][];
  private readonly _added: number[] = [];
  private readonly _removed: number[] = [];
  private readonly _componentSets: readonly SparseSet<unknown>[];

  // While the journal is applied: how many entries of `_entities`, `_added`
  // and `_removed` are in use. Their lengths are set to these at the end.
  private _count = 0;
  private _addedCount = 0;
  private _removedCount = 0;

  // Position in `_entities`, by entity slot. Valid only where the entity at
  // that position is the same handle.
  private readonly _positionBySlot: number[] = [];

  // `removedFlag`/`replacedFlag`, by position in `_entities`. Never shrunk:
  // only the positions of entities in the arrays are read.
  private readonly _flags: number[] = [];

  // Entities that started matching since the last run and still do.
  private readonly _pendingAdded: number[] = [];
  private _pendingAddedCount = 0;
  private readonly _pendingAddedPositionBySlot: number[] = [];

  // Entities in the arrays that stopped matching since the last run.
  private readonly _pendingRemoved: number[] = [];
  private _pendingRemovedCount = 0;

  // Entities in the arrays whose component was replaced since the last run.
  // An entry whose `replacedFlag` has since been cleared is skipped.
  private readonly _pendingReplaced: number[] = [];
  private _pendingReplacedCount = 0;

  /**
   * @param componentSets - The storage of each component the declaration
   * returns, in query order.
   */
  constructor(componentSets: readonly SparseSet<unknown>[]) {
    this._componentSets = componentSets;
    this._components = componentSets.map(() => []);
    this._result = {
      entities: this._entities,
      components: this._components,
      added: noEntities,
      removed: noEntities,
      lastRunTick: 0,
    };
  }

  /** The result the system's `update` receives. */
  get result(): QueryResult<unknown[]> {
    return this._result;
  }

  /**
   * Records that `entity` started matching.
   * @param entity - The entity.
   */
  public enter(entity: number): void {
    if (this._pendingAddedPosition(entity) !== -1) {
      return;
    }

    this._pendingAddedPositionBySlot[entityIndex(entity)] =
      this._pendingAddedCount;
    this._pendingAdded[this._pendingAddedCount++] = entity;
  }

  /**
   * Records that `entity` stopped matching.
   * @param entity - The entity.
   */
  public leave(entity: number): void {
    const pendingPosition = this._pendingAddedPosition(entity);

    if (pendingPosition !== -1) {
      // Entered since the last run: it was never reported, so it isn't now.
      // If it's still in the arrays from before, it's already pending
      // removal.
      this._removePendingAdded(pendingPosition);

      return;
    }

    const position = this._position(entity);

    if (position === -1 || (this._flags[position] & removedFlag) !== 0) {
      return;
    }

    this._flags[position] = removedFlag;
    this._pendingRemoved[this._pendingRemovedCount++] = entity;
  }

  /**
   * Records that one of `entity`'s components was replaced with another
   * object while it kept matching.
   * @param entity - The entity.
   */
  public replace(entity: number): void {
    if (this._pendingAddedPosition(entity) !== -1) {
      return;
    }

    const position = this._position(entity);

    if (position === -1 || this._flags[position] !== 0) {
      return;
    }

    this._flags[position] = replacedFlag;
    this._pendingReplaced[this._pendingReplacedCount++] = entity;
  }

  /**
   * Applies the journal to the arrays, and fills `added` and `removed` with
   * it.
   * @param lastRunTick - The change tick of the system's previous run.
   */
  public apply(lastRunTick: number): void {
    const result = this._result;

    result.lastRunTick = lastRunTick;

    if (
      this._pendingAddedCount === 0 &&
      this._pendingRemovedCount === 0 &&
      this._pendingReplacedCount === 0
    ) {
      result.added = noEntities;
      result.removed = noEntities;

      return;
    }

    this._count = this._entities.length;
    this._addedCount = 0;
    this._removedCount = 0;

    this._applyReplaced();
    this._applyRemoved();
    this._applyAdded();

    setLength(this._entities, this._count);

    for (let k = 0; k < this._components.length; k++) {
      setLength(this._components[k], this._count);
    }

    setLength(this._added, this._addedCount);
    setLength(this._removed, this._removedCount);
    result.added = this._addedCount === 0 ? noEntities : this._added;
    result.removed = this._removedCount === 0 ? noEntities : this._removed;
  }

  /**
   * Discards the arrays and the journal.
   */
  public clear(): void {
    for (const entity of this._entities) {
      this._positionBySlot[entityIndex(entity)] = -1;
    }

    for (let i = 0; i < this._pendingAddedCount; i++) {
      this._pendingAddedPositionBySlot[entityIndex(this._pendingAdded[i])] = -1;
    }

    this._entities.length = 0;
    this._flags.length = 0;

    for (const column of this._components) {
      column.length = 0;
    }

    this._added.length = 0;
    this._removed.length = 0;
    this._result.added = noEntities;
    this._result.removed = noEntities;
    this._pendingAddedCount = 0;
    this._pendingRemovedCount = 0;
    this._pendingReplacedCount = 0;
  }

  private _applyReplaced(): void {
    for (let i = 0; i < this._pendingReplacedCount; i++) {
      const entity = this._pendingReplaced[i];
      const position = this._position(entity);

      if (position === -1 || this._flags[position] !== replacedFlag) {
        continue;
      }

      this._flags[position] = 0;

      for (let k = 0; k < this._components.length; k++) {
        this._components[k][position] = this._componentSets[k].get(entity);
      }

      this._removed[this._removedCount++] = entity;
      this._added[this._addedCount++] = entity;
    }

    this._pendingReplacedCount = 0;
  }

  private _applyRemoved(): void {
    for (let i = 0; i < this._pendingRemovedCount; i++) {
      const entity = this._pendingRemoved[i];

      this._swapRemove(this._position(entity));
      this._removed[this._removedCount++] = entity;
    }

    this._pendingRemovedCount = 0;
  }

  private _applyAdded(): void {
    for (let i = 0; i < this._pendingAddedCount; i++) {
      const entity = this._pendingAdded[i];
      const position = this._count++;

      this._pendingAddedPositionBySlot[entityIndex(entity)] = -1;
      this._positionBySlot[entityIndex(entity)] = position;
      this._entities[position] = entity;
      this._flags[position] = 0;

      for (let k = 0; k < this._components.length; k++) {
        this._components[k][position] = this._componentSets[k].get(entity);
      }

      this._added[this._addedCount++] = entity;
    }

    this._pendingAddedCount = 0;
  }

  // Moves the last entity in use into `position`. The arrays keep their
  // length until `apply` sets it, so the storage isn't shrunk and regrown
  // while entities leave and enter in the same run.
  private _swapRemove(position: number): void {
    const lastPosition = this._count - 1;
    const entity = this._entities[position];

    if (position !== lastPosition) {
      const moved = this._entities[lastPosition];

      this._entities[position] = moved;
      this._flags[position] = this._flags[lastPosition];
      this._positionBySlot[entityIndex(moved)] = position;

      for (let k = 0; k < this._components.length; k++) {
        const column = this._components[k];

        column[position] = column[lastPosition];
      }
    }

    this._flags[lastPosition] = 0;
    this._positionBySlot[entityIndex(entity)] = -1;
    this._count = lastPosition;
  }

  private _removePendingAdded(position: number): void {
    const lastPosition = this._pendingAddedCount - 1;
    const entity = this._pendingAdded[position];

    if (position !== lastPosition) {
      const moved = this._pendingAdded[lastPosition];

      this._pendingAdded[position] = moved;
      this._pendingAddedPositionBySlot[entityIndex(moved)] = position;
    }

    this._pendingAddedCount = lastPosition;
    this._pendingAddedPositionBySlot[entityIndex(entity)] = -1;
  }

  private _position(entity: number): number {
    const position = this._positionBySlot[entityIndex(entity)];

    // A slot never written reads `undefined`, which fails `>= 0`.
    return position >= 0 && this._entities[position] === entity ? position : -1;
  }

  private _pendingAddedPosition(entity: number): number {
    const position = this._pendingAddedPositionBySlot[entityIndex(entity)];

    // A slot never written reads `undefined`, which fails `>= 0`.
    return position >= 0 &&
      position < this._pendingAddedCount &&
      this._pendingAdded[position] === entity
      ? position
      : -1;
  }
}

/**
 * The set of entities that match one declaration: they have every required
 * key and none of the excluded ones. The world keeps it up to date as
 * components are added and removed, and tells each system's
 * {@link QueryResultState} for it what changed. It exists while at least one
 * registered system declares it.
 */
export class QueryMembership {
  /** The declaration's canonical id: its required and excluded keys. */
  public readonly id: string;

  /** The number of system declarations using this membership. */
  public referenceCount = 0;

  private readonly _required: readonly SparseSet<unknown>[];
  private readonly _excluded: readonly SparseSet<unknown>[];
  private readonly _members: SparseSet<boolean> = new SparseSet();
  private readonly _consumers: QueryResultState[] = [];

  /**
   * Creates the membership and finds the entities that already match.
   * @param id - The declaration's canonical id.
   * @param required - The storage of every key an entity must have.
   * @param excluded - The storage of every key an entity must not have.
   */
  constructor(
    id: string,
    required: readonly SparseSet<unknown>[],
    excluded: readonly SparseSet<unknown>[],
  ) {
    this.id = id;
    this._required = required;
    this._excluded = excluded;

    if (required.length === 0) {
      return;
    }

    let driver = required[0];

    for (const set of required) {
      if (set.size < driver.size) {
        driver = set;
      }
    }

    for (let i = 0; i < driver.size; i++) {
      const entity = driver.denseEntities[i];

      if (this._matches(entity)) {
        this._members.add(entity, true);
      }
    }
  }

  /** The number of entities that match. */
  get size(): number {
    return this._members.size;
  }

  /**
   * Re-checks whether `entity` matches after one of the keys this
   * membership mentions was added to or removed from it.
   * @param entity - The entity.
   */
  public refresh(entity: number): void {
    const matches = this._matches(entity);

    if (matches === this._members.has(entity)) {
      return;
    }

    if (matches) {
      this._members.add(entity, true);

      for (let i = 0; i < this._consumers.length; i++) {
        this._consumers[i].enter(entity);
      }

      return;
    }

    this._members.remove(entity);

    for (let i = 0; i < this._consumers.length; i++) {
      this._consumers[i].leave(entity);
    }
  }

  /**
   * Tells every consumer that one of a matching entity's components was
   * replaced with another object.
   * @param entity - The entity.
   */
  public replace(entity: number): void {
    if (!this._members.has(entity)) {
      return;
    }

    for (let i = 0; i < this._consumers.length; i++) {
      this._consumers[i].replace(entity);
    }
  }

  /**
   * Starts telling `consumer` about changes, and reports every current
   * member to it as added.
   * @param consumer - The system's result state.
   */
  public subscribe(consumer: QueryResultState): void {
    this._consumers.push(consumer);

    for (let i = 0; i < this._members.size; i++) {
      consumer.enter(this._members.denseEntities[i]);
    }
  }

  /**
   * Stops telling `consumer` about changes.
   * @param consumer - The system's result state.
   */
  public unsubscribe(consumer: QueryResultState): void {
    const index = this._consumers.indexOf(consumer);

    if (index !== -1) {
      this._consumers.splice(index, 1);
    }

    consumer.clear();
  }

  private _matches(entity: number): boolean {
    if (this._required.length === 0) {
      return false;
    }

    for (let i = 0; i < this._required.length; i++) {
      if (!this._required[i].has(entity)) {
        return false;
      }
    }

    for (let i = 0; i < this._excluded.length; i++) {
      if (this._excluded[i].has(entity)) {
        return false;
      }
    }

    return true;
  }
}
