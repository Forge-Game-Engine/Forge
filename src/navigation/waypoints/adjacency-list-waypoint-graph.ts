import { Vector2 } from '../../math/vector2.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { WaypointConnectionOptions, WaypointGraph } from './waypoint-graph.js';

/** What a slot holds. */
const freeSlot = 0;
const enabledSlot = 1;
const disabledSlot = 2;

/** How many slots the state array holds when it's first grown. */
const initialStateCapacity = 16;

const defaultWaypointConnectionOptions = { bidirectional: true };

const assertFinitePosition = (action: string, position: Vector2): void => {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error(
      `Unable to ${action}, the position (${position.x}, ${position.y}) isn't finite.`,
    );
  }
};

const assertCost = (action: string, cost: number): void => {
  if (!Number.isFinite(cost) || cost <= 0) {
    throw new Error(
      `Unable to ${action} with cost ${cost}, it must be finite and more than 0.`,
    );
  }
};

/**
 * Removes the first occurrence of a value from an array.
 * @param values - The array.
 * @param value - The value to remove.
 * @returns `true` if the value was there.
 */
const removeValue = (values: number[], value: number): boolean => {
  const index = values.indexOf(value);

  if (index === -1) {
    return false;
  }

  values.splice(index, 1);

  return true;
};

/**
 * A waypoint graph that keeps one slot per id: the point's position, cost
 * and state, and the lists of points it has a step to and that have a step
 * to it. The incoming lists let removing a point drop the one-way
 * connections into it without scanning every point.
 */
export class AdjacencyListWaypointGraph implements WaypointGraph {
  private readonly _x: number[];
  private readonly _y: number[];
  private readonly _cost: number[];
  private readonly _outgoing: number[][];
  private readonly _incoming: number[][];
  private _state: Uint8Array;
  private _nodeCount: number;
  private _pointCount: number;
  private _version: number;

  // Freed ids in the order they were freed, read from `_freeIdsHead`
  // onwards, so the least recently freed id is reused first and a stale id
  // a game held on to is less likely to name a new point soon after.
  private readonly _freeIds: number[];
  private _freeIdsHead: number;

  // The lowest cost of any point, disabled ones included, which scales the
  // heuristic so it never overestimates. Raising or removing the cheapest
  // point marks it stale instead of rescanning; the next heuristic call
  // rescans. It starts stale, so the first heuristic after building a
  // graph whose points all cost more than `1` uses their real lowest cost.
  private _minCost: number;
  private _isMinCostStale: boolean;

  /**
   * Creates an empty waypoint graph.
   */
  constructor() {
    this._x = [];
    this._y = [];
    this._cost = [];
    this._outgoing = [];
    this._incoming = [];
    this._state = new Uint8Array(0);
    this._nodeCount = 0;
    this._pointCount = 0;
    this._version = 0;
    this._freeIds = [];
    this._freeIdsHead = 0;
    this._minCost = 1;
    this._isMinCostStale = true;
  }

  get nodeCount(): number {
    return this._nodeCount;
  }

  get pointCount(): number {
    return this._pointCount;
  }

  get version(): number {
    return this._version;
  }

  public addPoint(position: Vector2, cost: number = 1): number {
    assertFinitePosition('add a waypoint', position);
    assertCost('add a waypoint', cost);

    const id = this._allocateId();

    this._x[id] = position.x;
    this._y[id] = position.y;
    this._cost[id] = cost;
    this._outgoing[id] = [];
    this._incoming[id] = [];
    this._state[id] = enabledSlot;
    this._pointCount++;

    if (!this._isMinCostStale) {
      this._minCost = Math.min(this._minCost, cost);
    }

    this._version++;

    return id;
  }

  public removePoint(id: number): void {
    this._assertPoint('remove', id);

    for (const neighbor of this._outgoing[id]) {
      removeValue(this._incoming[neighbor], id);
    }

    for (const neighbor of this._incoming[id]) {
      removeValue(this._outgoing[neighbor], id);
    }

    // The position and cost stay in their arrays until the id is reused;
    // marking the slot free is what removes the point.
    this._outgoing[id] = [];
    this._incoming[id] = [];
    this._state[id] = freeSlot;
    this._freeIds.push(id);
    this._pointCount--;

    if (this._cost[id] === this._minCost) {
      this._isMinCostStale = true;
    }

    this._version++;
  }

  public hasPoint(id: number): boolean {
    return (
      Number.isInteger(id) &&
      id >= 0 &&
      id < this._nodeCount &&
      this._state[id] !== freeSlot
    );
  }

  public getPosition(id: number): Vector2 {
    this._assertPoint('read the position of', id);

    return { x: this._x[id], y: this._y[id] };
  }

  public setPosition(id: number, position: Vector2): void {
    this._assertPoint('move', id);
    assertFinitePosition(`move waypoint ${id}`, position);

    if (this._x[id] === position.x && this._y[id] === position.y) {
      return;
    }

    this._x[id] = position.x;
    this._y[id] = position.y;
    this._version++;
  }

  public getCost(id: number): number {
    this._assertPoint('read the cost of', id);

    return this._cost[id];
  }

  public setCost(id: number, cost: number): void {
    this._assertPoint('set the cost of', id);
    assertCost(`set the cost of waypoint ${id}`, cost);

    const previous = this._cost[id];

    if (previous === cost) {
      return;
    }

    this._cost[id] = cost;
    this._version++;

    if (this._isMinCostStale) {
      return;
    }

    if (cost < this._minCost) {
      this._minCost = cost;
    } else if (previous === this._minCost) {
      this._isMinCostStale = true;
    }
  }

  public isEnabled(id: number): boolean {
    this._assertPoint('read whether it can enter', id);

    return this._state[id] === enabledSlot;
  }

  public setEnabled(id: number, enabled: boolean): void {
    this._assertPoint(enabled ? 'enable' : 'disable', id);

    const state = enabled ? enabledSlot : disabledSlot;

    if (this._state[id] === state) {
      return;
    }

    this._state[id] = state;
    this._version++;
  }

  public getPointIds(): number[] {
    const ids: number[] = [];

    for (let id = 0; id < this._nodeCount; id++) {
      if (this._state[id] !== freeSlot) {
        ids.push(id);
      }
    }

    return ids;
  }

  public connect(
    a: number,
    b: number,
    options?: WaypointConnectionOptions,
  ): void {
    const { bidirectional } = withDefaults(
      defaultWaypointConnectionOptions,
      options,
    );

    this._assertPoint('connect', a);
    this._assertPoint(`connect waypoint ${a} to`, b);

    if (a === b) {
      throw new Error(
        `Unable to connect waypoint ${a} to itself, a connection joins two different points.`,
      );
    }

    let changed = this._addStep(a, b);

    if (bidirectional) {
      changed = this._addStep(b, a) || changed;
    }

    if (changed) {
      this._version++;
    }
  }

  public disconnect(
    a: number,
    b: number,
    options?: WaypointConnectionOptions,
  ): void {
    const { bidirectional } = withDefaults(
      defaultWaypointConnectionOptions,
      options,
    );

    this._assertPoint('disconnect', a);
    this._assertPoint(`disconnect waypoint ${a} from`, b);

    let changed = this._removeStep(a, b);

    if (bidirectional) {
      changed = this._removeStep(b, a) || changed;
    }

    if (changed) {
      this._version++;
    }
  }

  public isConnected(a: number, b: number): boolean {
    this._assertPoint('read the connections of', a);
    this._assertPoint(`read whether waypoint ${a} connects to`, b);

    return this._outgoing[a].includes(b);
  }

  public getConnections(id: number): number[] {
    this._assertPoint('read the connections of', id);

    return [...this._outgoing[id]];
  }

  public closestPoint(position: Vector2): number | null {
    assertFinitePosition('find the closest waypoint', position);

    let closest: number | null = null;
    let closestDistanceSquared = Infinity;

    for (let id = 0; id < this._nodeCount; id++) {
      if (this._state[id] !== enabledSlot) {
        continue;
      }

      const dx = this._x[id] - position.x;
      const dy = this._y[id] - position.y;
      const distanceSquared = dx * dx + dy * dy;

      // Strictly nearer, so the lowest id wins a tie.
      if (distanceSquared < closestDistanceSquared) {
        closest = id;
        closestDistanceSquared = distanceSquared;
      }
    }

    return closest;
  }

  public forEachNeighbor(
    node: number,
    visit: (neighbor: number, cost: number) => void,
  ): void {
    // A free slot's list is empty, so a removed point reports no steps.
    const outgoing = this._outgoing[node];
    const x = this._x[node];
    const y = this._y[node];

    for (const neighbor of outgoing) {
      if (this._state[neighbor] === enabledSlot) {
        visit(
          neighbor,
          Math.hypot(this._x[neighbor] - x, this._y[neighbor] - y) *
            this._cost[neighbor],
        );
      }
    }
  }

  public heuristic(node: number, goal: number): number {
    return (
      this._getMinCost() *
      Math.hypot(this._x[goal] - this._x[node], this._y[goal] - this._y[node])
    );
  }

  /**
   * Throws if an id isn't the id of a point in the graph.
   * @param action - What the caller was doing, for the message.
   * @param id - The id.
   * @throws An error if no point has the id.
   */
  private _assertPoint(action: string, id: number): void {
    if (!this.hasPoint(id)) {
      throw new Error(
        `Unable to ${action} waypoint ${id}, it isn't a point of the graph.`,
      );
    }
  }

  /**
   * Takes the least recently freed id, or a new id at `nodeCount` when none
   * is free.
   * @returns The id.
   */
  private _allocateId(): number {
    if (this._freeIdsHead < this._freeIds.length) {
      const id = this._freeIds[this._freeIdsHead];

      this._freeIdsHead++;
      this._compactFreeIds();

      return id;
    }

    const id = this._nodeCount;

    if (id === this._state.length) {
      const state = new Uint8Array(
        Math.max(initialStateCapacity, this._state.length * 2),
      );

      state.set(this._state);
      this._state = state;
    }

    this._nodeCount++;

    return id;
  }

  /**
   * Drops the reused ids from the front of the free-id queue once they make
   * up half of it, so a game that adds and removes points every frame
   * doesn't grow it forever.
   */
  private _compactFreeIds(): void {
    if (this._freeIdsHead * 2 < this._freeIds.length) {
      return;
    }

    this._freeIds.splice(0, this._freeIdsHead);
    this._freeIdsHead = 0;
  }

  /**
   * Adds a step from `from` to `to` if there isn't one.
   * @param from - The point the step starts from.
   * @param to - The point the step goes to.
   * @returns `true` if the step was added.
   */
  private _addStep(from: number, to: number): boolean {
    if (this._outgoing[from].includes(to)) {
      return false;
    }

    this._outgoing[from].push(to);
    this._incoming[to].push(from);

    return true;
  }

  /**
   * Removes the step from `from` to `to` if there is one.
   * @param from - The point the step starts from.
   * @param to - The point the step goes to.
   * @returns `true` if the step was removed.
   */
  private _removeStep(from: number, to: number): boolean {
    if (!removeValue(this._outgoing[from], to)) {
      return false;
    }

    removeValue(this._incoming[to], from);

    return true;
  }

  private _getMinCost(): number {
    if (this._isMinCostStale) {
      let minCost = Infinity;

      // A freed slot keeps the cost of the point that was removed from it,
      // so only slots holding a point count.
      for (let id = 0; id < this._nodeCount; id++) {
        if (this._state[id] !== freeSlot) {
          minCost = Math.min(minCost, this._cost[id]);
        }
      }

      // With no points there's no route to estimate. It stays stale, so
      // the next point added sets it.
      if (minCost === Infinity) {
        return 1;
      }

      this._minCost = minCost;
      this._isMinCostStale = false;
    }

    return this._minCost;
  }
}
