import { describe, expect, it } from 'vitest';
import {
  addPositionComponent,
  PositionEcsComponent,
} from '../../common/components/position-component.js';
import { createTransformEcsSystem } from '../../common/systems/transform-system.js';
import { Time } from '../../common/time/Time.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { createOrthogonalGridLayout } from '../../math/grid-layout/create-orthogonal-grid-layout.js';
import { Vector2 } from '../../math/vector2.js';
import {
  addNavigationAgentComponent,
  NavigationAgentEcsComponent,
  NavigationAgentStatus,
} from '../components/navigation-agent-component.js';
import { createGridPathPlanner } from '../grid/create-grid-path-planner.js';
import { createNavigationGrid } from '../grid/create-navigation-grid.js';
import { NavigationGrid } from '../grid/navigation-grid.js';
import { PathPlanner, PlannedPath, PlanPathOptions } from '../path-planner.js';
import { cellRange } from '../test-helpers/cell-range.js';
import { createWaypointGraph } from '../waypoints/create-waypoint-graph.js';
import { createWaypointPathPlanner } from '../waypoints/create-waypoint-path-planner.js';
import {
  createNavigationAgentEcsSystem,
  NavigationAgentSystemOptions,
} from './navigation-agent-system.js';

const cellSize = 10;
const frameMilliseconds = 1000 / 60;

const layout = createOrthogonalGridLayout({
  cellWidth: cellSize,
  cellHeight: cellSize,
});

const createGrid = (columns: number, rows: number): NavigationGrid =>
  createNavigationGrid({ cells: cellRange(columns, rows), layout });

/** The world centre of a cell of a grid made by `createGrid`. */
const center = (column: number, row: number): Vector2 => ({
  x: column * cellSize + cellSize / 2,
  y: row * cellSize + cellSize / 2,
});

const distance = (a: Vector2, b: Vector2): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

const speedOf = (velocity: Vector2): number =>
  Math.hypot(velocity.x, velocity.y);

interface Unit {
  entity: number;
  agent: NavigationAgentEcsComponent;
  position: PositionEcsComponent;
}

interface Scene {
  world: EcsWorld;
  time: Time;
  system: EcsSystem<[NavigationAgentEcsComponent, PositionEcsComponent]>;
  units: Unit[];
  addUnit(
    at: Vector2,
    planner: PathPlanner,
    options?: { speed?: number; arrivalRadius?: number; target?: Vector2 },
  ): Unit;
  /**
   * Runs one tick, then moves every unit by its desired velocity, as the
   * game's system that applies it would.
   */
  step(move?: boolean): void;
  /** Steps until `done` or `maxTicks`, returning the ticks it took. */
  runUntil(done: () => boolean, maxTicks?: number): number;
}

const createScene = (options?: NavigationAgentSystemOptions): Scene => {
  const world = new EcsWorld();
  const time = new Time();
  let now = 0;

  time.update(now);

  const system = createNavigationAgentEcsSystem(time, options);
  const units: Unit[] = [];

  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(system);

  const step = (move = true): void => {
    now += frameMilliseconds;
    time.update(now);
    world.update();

    if (!move) {
      return;
    }

    for (const { agent, position } of units) {
      position.local.x += agent.desiredVelocity.x * time.deltaTimeInSeconds;
      position.local.y += agent.desiredVelocity.y * time.deltaTimeInSeconds;
    }
  };

  return {
    world,
    time,
    system,
    units,
    addUnit: (at, planner, unitOptions = {}): Unit => {
      const entity = world.createEntity();
      const position = addPositionComponent(world, entity, {
        local: { x: at.x, y: at.y },
      });
      const agent = addNavigationAgentComponent(world, entity, {
        planner,
        speed: unitOptions.speed ?? 100,
        arrivalRadius: unitOptions.arrivalRadius,
        target: unitOptions.target,
      });
      const unit = { entity, agent, position };

      units.push(unit);

      return unit;
    },
    step,
    runUntil: (done, maxTicks = 1000): number => {
      for (let tick = 1; tick <= maxTicks; tick++) {
        step();

        if (done()) {
          return tick;
        }
      }

      throw new Error(`Not done after ${maxTicks} ticks.`);
    },
  };
};

/** Wraps a planner, recording every call and its result. */
const spyOnPlanner = (
  planner: PathPlanner,
): {
  planner: PathPlanner;
  calls: {
    from: Vector2;
    to: Vector2;
    options: PlanPathOptions | undefined;
    result: PlannedPath;
  }[];
} => {
  const calls: {
    from: Vector2;
    to: Vector2;
    options: PlanPathOptions | undefined;
    result: PlannedPath;
  }[] = [];

  return {
    calls,
    planner: {
      get version(): number {
        return planner.version;
      },
      maxPathDistance: planner.maxPathDistance,
      planPath: (from, to, options): PlannedPath => {
        const result = planner.planPath(from, to, options);

        calls.push({
          from: { x: from.x, y: from.y },
          to: { x: to.x, y: to.y },
          options,
          result,
        });

        return result;
      },
    },
  };
};

/** A planner that always returns the same path. */
const createFixedPlanner = (points: Vector2[]): PathPlanner => ({
  version: 0,
  maxPathDistance: Infinity,
  planPath: (): PlannedPath => ({
    status: 'found',
    points: points.map(({ x, y }) => ({ x, y })),
    expanded: 1,
  }),
});

/** A wall down column 3, rows 0 to 6, on a 10 x 10 grid. */
const createWalledGrid = (): NavigationGrid => {
  const grid = createGrid(10, 10);

  grid.fillWalkable(
    { minColumn: 3, minRow: 0, maxColumn: 3, maxRow: 6 },
    false,
  );

  return grid;
};

describe('createNavigationAgentEcsSystem', () => {
  describe('planning and arriving', () => {
    it('walks around a wall to the target and stops exactly on it', () => {
      const scene = createScene();
      const grid = createWalledGrid();
      const target = { x: 62, y: 17 };
      const { agent, position } = scene.addUnit(
        center(1, 1),
        createGridPathPlanner(grid),
      );
      const statuses: NavigationAgentStatus[] = [];

      scene.step();
      expect(agent.status).toBe('idle');

      agent.target = target;
      scene.runUntil(() => {
        statuses.push(agent.status);

        const cell = grid.worldToCell(position.world);

        expect(cell).not.toBeNull();
        expect(grid.isWalkable(cell!.column, cell!.row)).toBe(true);

        return agent.status === 'arrived';
      });

      expect(statuses[0]).toBe('moving');
      expect(new Set(statuses)).toEqual(new Set(['moving', 'arrived']));
      expect(distance(position.world, target)).toBeLessThan(1e-9);
      expect(agent.desiredVelocity).toEqual({ x: 0, y: 0 });
      expect(agent.pathStatus).toBe('found');
      expect(agent.path[0]).toEqual(center(1, 1));
      expect(agent.path[agent.path.length - 1]).toEqual(target);

      // It went below the wall.
      expect(agent.path.some((point) => point.y > 70)).toBe(true);

      scene.step();
      expect(agent.status).toBe('arrived');
      expect(agent.desiredVelocity).toEqual({ x: 0, y: 0 });
    });

    it('arrives at the snapped cell centre for a target inside a wall', () => {
      const scene = createScene();
      const grid = createWalledGrid();
      const spy = spyOnPlanner(createGridPathPlanner(grid));
      const inWall = { x: 34, y: 16 };
      const { agent, position } = scene.addUnit(center(1, 1), spy.planner, {
        target: inWall,
      });

      scene.runUntil(() => agent.status === 'arrived');

      const cell = grid.worldToCell(position.world)!;

      expect(grid.isWalkable(cell.column, cell.row)).toBe(true);
      expect(
        distance(position.world, grid.cellToWorld(cell.column, cell.row)),
      ).toBeLessThan(1e-9);
      expect(distance(position.world, inWall)).toBeGreaterThan(1);

      for (let i = 0; i < 10; i++) {
        scene.step();
      }

      expect(agent.status).toBe('arrived');
      expect(spy.calls).toHaveLength(1);
    });
  });

  describe('re-planning', () => {
    it('re-plans after the grid changes, and not when it does not', () => {
      const scene = createScene();
      const grid = createGrid(10, 10);
      const { agent } = scene.addUnit(
        center(0, 5),
        createGridPathPlanner(grid),
        {
          target: center(9, 5),
        },
      );

      scene.step();

      const firstPath = agent.path;

      expect(firstPath).toEqual([center(0, 5), center(9, 5)]);

      // Already walkable: no change, no version, no plan.
      grid.setWalkable(6, 5, true);
      scene.step();
      expect(agent.path).toBe(firstPath);

      grid.setWalkable(6, 5, false);
      scene.step();
      expect(agent.path).not.toBe(firstPath);
      expect(agent.path.length).toBeGreaterThan(2);
      expect(agent.plannedVersion).toBe(grid.version);

      scene.runUntil(() => agent.status === 'arrived');
    });

    it('re-plans after drifting further from its path than maxPathDistance', () => {
      const scene = createScene();
      const grid = createGrid(20, 20);
      const spy = spyOnPlanner(createGridPathPlanner(grid));
      const { agent, position } = scene.addUnit(
        { x: 15, y: 100 },
        spy.planner,
        {
          target: { x: 185, y: 100 },
        },
      );

      scene.step(false);
      expect(spy.calls).toHaveLength(1);

      position.local.y += 8;
      scene.step(false);
      expect(spy.calls).toHaveLength(1);

      position.local.y += 7;
      scene.step(false);
      expect(spy.calls).toHaveLength(2);
      expect(spy.calls[1].from).toEqual({ x: 15, y: 115 });
      expect(agent.path[0]).toEqual({ x: 15, y: 115 });
    });

    it('allows drifting up to its arrival radius when that is larger', () => {
      const scene = createScene();
      const grid = createGrid(20, 20);
      const spy = spyOnPlanner(createGridPathPlanner(grid));
      const { position } = scene.addUnit({ x: 15, y: 100 }, spy.planner, {
        target: { x: 185, y: 100 },
        arrivalRadius: 25,
      });

      scene.step(false);

      position.local.y += 15;
      scene.step(false);
      expect(spy.calls).toHaveLength(1);

      position.local.y += 15;
      scene.step(false);
      expect(spy.calls).toHaveLength(2);
    });

    it('turns corners with a large arrival radius without re-planning', () => {
      const budget = 4096;
      const scene = createScene({ maxExpandedPerUpdate: budget });
      const grid = createGrid(12, 12);

      // An L-shaped wall: down column 5 from the top, and along row 9 to
      // the right of it, so the path turns at least twice.
      grid.fillWalkable(
        { minColumn: 5, minRow: 0, maxColumn: 5, maxRow: 9 },
        false,
      );
      grid.fillWalkable(
        { minColumn: 5, minRow: 9, maxColumn: 9, maxRow: 9 },
        false,
      );

      const spy = spyOnPlanner(createGridPathPlanner(grid));
      const { agent } = scene.addUnit(center(1, 1), spy.planner, {
        target: center(8, 7),
        arrivalRadius: 25,
      });

      scene.step();

      const path = agent.path;

      expect(path.length).toBeGreaterThanOrEqual(4);

      scene.runUntil(() => {
        expect(agent.requestedFrame).toBeNull();
        expect(agent.path).toBe(path);

        return agent.status === 'arrived';
      });

      expect(spy.calls).toHaveLength(1);
    });

    it('re-plans when the target changes in place or to a new value', () => {
      const scene = createScene();
      const spy = spyOnPlanner(createGridPathPlanner(createGrid(10, 10)));
      const target = center(9, 5);
      const { agent } = scene.addUnit(center(0, 5), spy.planner, { target });

      scene.step();
      expect(spy.calls).toHaveLength(1);

      agent.target = { x: target.x, y: target.y };
      scene.step();
      expect(spy.calls).toHaveLength(1);

      agent.target.y = center(9, 8).y;
      scene.step();
      expect(spy.calls).toHaveLength(2);
      expect(agent.plannedTarget).toEqual(center(9, 8));
      expect(agent.plannedTarget).not.toBe(agent.target);

      agent.target = center(2, 2);
      scene.step();
      expect(spy.calls).toHaveLength(3);
    });

    it('goes idle with a zero velocity when the target is cleared', () => {
      const scene = createScene();
      const { agent } = scene.addUnit(
        center(0, 5),
        createGridPathPlanner(createGrid(10, 10)),
        { target: center(9, 5) },
      );

      scene.step();
      expect(speedOf(agent.desiredVelocity)).toBeGreaterThan(0);

      agent.target = null;
      scene.step();

      expect(agent.status).toBe('idle');
      expect(agent.desiredVelocity).toEqual({ x: 0, y: 0 });
      expect(agent.path).toEqual([]);
      expect(agent.plannedTarget).toBeNull();
    });

    it('stays arrived when pushed or when the grid changes, until the target changes', () => {
      const scene = createScene();
      const grid = createGrid(10, 10);
      const spy = spyOnPlanner(createGridPathPlanner(grid));
      const { agent, position } = scene.addUnit(center(0, 5), spy.planner, {
        target: center(4, 5),
      });

      scene.runUntil(() => agent.status === 'arrived');

      position.local.x += 30;
      grid.setWalkable(8, 8, false);
      scene.step();
      scene.step();

      expect(agent.status).toBe('arrived');
      expect(agent.desiredVelocity).toEqual({ x: 0, y: 0 });
      expect(spy.calls).toHaveLength(1);

      agent.target = center(4, 2);
      scene.step();
      expect(spy.calls).toHaveLength(2);
      expect(agent.status).toBe('moving');
    });
  });

  describe('unreachable targets', () => {
    it('walks to the nearest reachable cell, stops, and goes on once the wall opens', () => {
      const scene = createScene();
      const grid = createGrid(10, 10);

      grid.fillWalkable(
        { minColumn: 6, minRow: 0, maxColumn: 6, maxRow: 9 },
        false,
      );

      const target = center(8, 5);
      const { agent, position } = scene.addUnit(
        center(1, 5),
        createGridPathPlanner(grid),
        { target },
      );

      scene.step();
      expect(agent.status).toBe('unreachable');
      expect(agent.pathStatus).toBe('unreachable');

      scene.runUntil(() => speedOf(agent.desiredVelocity) === 0);

      expect(distance(position.world, center(5, 5))).toBeLessThan(1e-9);

      scene.step();
      expect(agent.status).toBe('unreachable');

      grid.setWalkable(6, 5, true);
      scene.runUntil(() => agent.status === 'arrived');

      expect(distance(position.world, target)).toBeLessThan(1e-9);
    });

    it('has nothing to walk on a waypoint graph with no enabled point', () => {
      const scene = createScene();
      const graph = createWaypointGraph();
      const spy = spyOnPlanner(createWaypointPathPlanner(graph));
      const { agent, position } = scene.addUnit({ x: 0, y: 0 }, spy.planner, {
        target: { x: 50, y: 0 },
      });

      scene.step();
      expect(agent.status).toBe('unreachable');
      expect(agent.path).toEqual([]);
      expect(agent.desiredVelocity).toEqual({ x: 0, y: 0 });

      position.local.x += 500;
      scene.step();
      scene.step();
      expect(spy.calls).toHaveLength(1);

      graph.addPoint({ x: 600, y: 0 });
      scene.step();
      expect(spy.calls).toHaveLength(2);
      expect(agent.status).toBe('moving');
    });
  });

  describe('following', () => {
    it('slows over the last arrival radius as speed * sqrt(remaining / radius)', () => {
      const scene = createScene();
      const speed = 100;
      const arrivalRadius = 30;
      const target = { x: 185, y: 100 };
      const { agent, position } = scene.addUnit(
        { x: 15, y: 100 },
        createGridPathPlanner(createGrid(20, 20)),
        { target, speed, arrivalRadius },
      );
      const deltaSeconds = frameMilliseconds / 1000;
      let slowed = 0;

      scene.runUntil(() => {
        const remaining = distance(position.world, target);
        const actual = speedOf(agent.desiredVelocity);

        if (agent.status === 'arrived') {
          return true;
        }

        const expected = Math.min(
          remaining < arrivalRadius
            ? speed * Math.sqrt(remaining / arrivalRadius)
            : speed,
          remaining / deltaSeconds,
        );

        expect(actual).toBeCloseTo(expected, 9);

        if (remaining < arrivalRadius) {
          slowed++;
        }

        return false;
      });

      expect(slowed).toBeGreaterThan(3);
      expect(distance(position.world, target)).toBeLessThan(1e-9);
    });

    it('walks at full speed until the last tick with an arrival radius of 0', () => {
      const scene = createScene();
      // 95.5 units at 100 a second: the last tick is a part of one.
      const target = { x: 100.5, y: 5 };
      const { agent, position } = scene.addUnit(
        { x: 5, y: 5 },
        createGridPathPlanner(createGrid(20, 20)),
        { target, speed: 100 },
      );
      const speeds: number[] = [];

      scene.runUntil(() => {
        speeds.push(speedOf(agent.desiredVelocity));

        return agent.status === 'arrived';
      });

      const moving = speeds.slice(0, -2);

      expect(moving.every((value) => Math.abs(value - 100) < 1e-9)).toBe(true);
      expect(speeds[speeds.length - 2]).toBeLessThan(100);
      expect(speeds[speeds.length - 1]).toBe(0);
      expect(distance(position.world, target)).toBeLessThan(1e-9);
    });

    it('moves on past a waypoint within its arrival radius or once passed, and not before', () => {
      const scene = createScene();
      const planner = createFixedPlanner([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 10 },
      ]);
      const { agent, position } = scene.addUnit({ x: 0, y: 0 }, planner, {
        target: { x: 20, y: 10 },
        arrivalRadius: 2,
      });

      scene.step(false);
      expect(agent.waypointIndex).toBe(1);
      expect(agent.desiredVelocity.x).toBeGreaterThan(0);
      expect(agent.desiredVelocity.y).toBe(0);

      position.local.x = 5;
      scene.step(false);
      expect(agent.waypointIndex).toBe(1);

      position.local.x = 8.5;
      scene.step(false);
      expect(agent.waypointIndex).toBe(2);
      expect(agent.desiredVelocity.y).toBeGreaterThan(0);

      // Overshot the corner at (10, 10) to the right of it, out of reach
      // of the radius but past the line through it.
      position.local = { x: 10, y: 14 };
      scene.step(false);
      expect(agent.waypointIndex).toBe(3);
      expect(agent.desiredVelocity.x).toBeGreaterThan(0);
    });

    it('keeps walking its current path while it waits for a new one', () => {
      // Each plan takes the whole budget, so one agent plans a tick.
      const scene = createScene({ maxExpandedPerUpdate: 1 });
      const planner = createFixedPlanner([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]);
      const { agent } = scene.addUnit({ x: 0, y: 0 }, planner, {
        target: { x: 100, y: 0 },
      });
      const other = scene.addUnit({ x: 0, y: 50 }, planner, {
        target: { x: 100, y: 0 },
      });

      scene.step();
      expect(agent.status).toBe('moving');
      expect(other.agent.status).toBe('planning');

      // The other agent has waited longer, so this one waits behind it.
      agent.target = { x: 100, y: 0.5 };
      scene.step();

      expect(other.agent.status).toBe('moving');
      expect(agent.status).toBe('planning');
      expect(agent.desiredVelocity.x).toBeCloseTo(100);
      expect(agent.desiredVelocity.y).toBe(0);

      scene.step();
      expect(agent.status).toBe('moving');
    });
  });

  describe('the planning budget', () => {
    it('spreads 50 simultaneous requests over ticks within the budget, in order, without dropping any', () => {
      const budget = 120;
      const scene = createScene({ maxExpandedPerUpdate: budget });
      const spy = spyOnPlanner(createGridPathPlanner(createGrid(40, 60)));
      const units: Unit[] = [];

      for (let i = 0; i < 50; i++) {
        units.push(scene.addUnit(center(0, i), spy.planner));
      }

      units.forEach((unit, i) => {
        unit.agent.target = center(39, 59 - i);
      });

      const plannedOnTick = new Map<Unit, number>();
      const expandedPerTick: number[] = [];

      for (let tick = 1; tick <= 200 && plannedOnTick.size < 50; tick++) {
        const before = spy.calls.length;

        scene.step(false);

        const calls = spy.calls.slice(before);

        expandedPerTick.push(
          calls.reduce((sum, call) => sum + call.result.expanded, 0),
        );

        for (const unit of units) {
          if (!plannedOnTick.has(unit) && unit.agent.requestedFrame === null) {
            plannedOnTick.set(unit, tick);
          }
        }
      }

      // Only a search given the whole budget builds a cut-short path.
      for (const { options } of spy.calls) {
        expect(options?.keepPartialPath).toBe(options?.maxExpanded === budget);
      }

      expect(plannedOnTick.get(units[0])).toBe(1);
      expect(plannedOnTick.get(units[49])).toBeGreaterThan(1);
      expect(plannedOnTick.size).toBe(50);
      expect(expandedPerTick.length).toBeGreaterThan(5);
      expect(expandedPerTick.every((expanded) => expanded <= budget)).toBe(
        true,
      );

      const ticks = units.map((unit) => plannedOnTick.get(unit)!);

      for (let k = 1; k < ticks.length; k++) {
        expect(ticks[k]).toBeGreaterThanOrEqual(ticks[k - 1]);
      }

      for (const unit of units) {
        expect(unit.agent.status).toBe('moving');
        expect(unit.agent.pathStatus).toBe('found');
      }
    });

    it('plans the agent waiting longest first, then the one created first', () => {
      const scene = createScene({ maxExpandedPerUpdate: 1 });
      const planner = createFixedPlanner([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ]);
      const early = scene.addUnit({ x: 0, y: 0 }, planner);
      const middle = scene.addUnit({ x: 0, y: 0 }, planner);
      const late = scene.addUnit({ x: 0, y: 0 }, planner);

      late.agent.target = { x: 10, y: 0 };
      middle.agent.target = { x: 10, y: 0 };
      scene.step(false);
      expect(middle.agent.status).toBe('moving');
      expect(late.agent.status).toBe('planning');

      early.agent.target = { x: 10, y: 0 };
      scene.step(false);
      expect(late.agent.status).toBe('moving');
      expect(early.agent.status).toBe('planning');

      scene.step(false);
      expect(early.agent.status).toBe('moving');
    });

    it('keeps its place in line when its target changes while it waits', () => {
      const scene = createScene({ maxExpandedPerUpdate: 1 });
      const spy = spyOnPlanner(
        createFixedPlanner([
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ]),
      );
      const first = scene.addUnit({ x: 0, y: 0 }, spy.planner, {
        target: { x: 10, y: 0 },
      });
      const second = scene.addUnit({ x: 0, y: 0 }, spy.planner, {
        target: { x: 10, y: 0 },
      });

      scene.step(false);
      expect(first.agent.status).toBe('moving');

      const requestedFrame = second.agent.requestedFrame;

      second.agent.target = { x: 20, y: 0 };
      scene.step(false);

      expect(requestedFrame).not.toBeNull();
      expect(second.agent.status).toBe('moving');
      expect(second.agent.plannedTarget).toEqual({ x: 20, y: 0 });
      expect(spy.calls[1].to).toEqual({ x: 20, y: 0 });
    });

    it('walks a search larger than the whole budget and re-plans from its end', () => {
      const budget = 8;
      const scene = createScene({ maxExpandedPerUpdate: budget });
      // A corridor longer than the budget's worth of cells.
      const grid = createGrid(40, 3);
      const spy = spyOnPlanner(createGridPathPlanner(grid));
      const target = center(39, 1);
      const { agent, position } = scene.addUnit(center(0, 1), spy.planner, {
        target,
      });

      scene.step();
      expect(agent.pathStatus).toBe('limitReached');
      expect(agent.status).toBe('moving');
      expect(spy.calls[0].options).toEqual({
        maxExpanded: budget,
        keepPartialPath: true,
      });

      const end = agent.path[agent.path.length - 1];

      scene.runUntil(() => spy.calls.length > 1);
      expect(distance(spy.calls[1].from, end)).toBeLessThan(1e-9);

      scene.runUntil(() => agent.status === 'arrived');
      expect(agent.pathStatus).toBe('found');
      expect(distance(position.world, target)).toBeLessThan(1e-9);
    });
  });

  describe('waypoint graphs', () => {
    it('walks a road network to the target and re-plans around a closed point', () => {
      const scene = createScene();
      const graph = createWaypointGraph();
      const a = graph.addPoint({ x: 0, y: 0 });
      const b = graph.addPoint({ x: 100, y: 0 });
      const c = graph.addPoint({ x: 100, y: 100 });
      const d = graph.addPoint({ x: 0, y: 150 });

      graph.connect(a, b);
      graph.connect(b, c);
      graph.connect(a, d);
      graph.connect(d, c);

      const target = { x: 110, y: 100 };
      const { agent, position } = scene.addUnit(
        { x: -5, y: 0 },
        createWaypointPathPlanner(graph),
        { target },
      );

      scene.step();
      expect(agent.path).toEqual([
        { x: -5, y: 0 },
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        target,
      ]);

      graph.setEnabled(b, false);
      scene.step();

      expect(agent.path.some((point) => point.x === 0 && point.y === 150)).toBe(
        true,
      );

      scene.runUntil(() => agent.status === 'arrived');
      expect(distance(position.world, target)).toBeLessThan(1e-9);
    });
  });

  describe('ownership and state', () => {
    it("doesn't write the position or the agent's inputs", () => {
      const scene = createScene();
      const planner = createGridPathPlanner(createGrid(10, 10));
      const target = center(9, 5);
      const { agent, position } = scene.addUnit(center(0, 5), planner, {
        target,
        arrivalRadius: 3,
        speed: 40,
      });

      scene.step(false);
      scene.step(false);

      expect(position.local).toEqual(center(0, 5));
      expect(position.world).toEqual(center(0, 5));
      expect(agent.target).toBe(target);
      expect(target).toEqual(center(9, 5));
      expect(agent.planner).toBe(planner);
      expect(agent.speed).toBe(40);
      expect(agent.arrivalRadius).toBe(3);
    });

    it('gives the same output from a fresh system instance mid-walk', () => {
      const run = (swap: boolean): Unit => {
        const scene = createScene({ maxExpandedPerUpdate: 30 });
        const grid = createWalledGrid();
        const planner = createGridPathPlanner(grid);
        const unit = scene.addUnit(center(1, 1), planner, {
          target: center(6, 1),
          arrivalRadius: 5,
        });

        scene.addUnit(center(0, 9), planner, { target: center(9, 9) });

        for (let tick = 0; tick < 10; tick++) {
          scene.step();
        }

        if (swap) {
          scene.world.removeSystem(scene.system);
          scene.world.addSystem(
            createNavigationAgentEcsSystem(scene.time, {
              maxExpandedPerUpdate: 30,
            }),
          );
        }

        for (let tick = 0; tick < 20; tick++) {
          scene.step();
        }

        return unit;
      };

      const kept = run(false);
      const swapped = run(true);

      expect(swapped.position.world).toEqual(kept.position.world);
      expect(swapped.agent.path).toEqual(kept.agent.path);
      expect(swapped.agent.status).toBe(kept.agent.status);
      expect(swapped.agent.waypointIndex).toBe(kept.agent.waypointIndex);
      expect(swapped.agent.desiredVelocity).toEqual(kept.agent.desiredVelocity);
    });

    it('plans a new agent from scratch after another is removed', () => {
      const scene = createScene();
      const planner = createGridPathPlanner(createGrid(10, 10));
      const first = scene.addUnit(center(0, 5), planner, {
        target: center(9, 5),
      });

      scene.step();
      scene.world.removeEntity(first.entity);
      scene.units.length = 0;

      const second = scene.addUnit(center(2, 2), planner, {
        target: center(2, 8),
      });

      scene.step();

      expect(second.agent.status).toBe('moving');
      expect(second.agent.path).toEqual([center(2, 2), center(2, 8)]);
    });
  });

  describe('errors', () => {
    it('throws for an invalid maxExpandedPerUpdate', () => {
      const time = new Time();

      expect(() =>
        createNavigationAgentEcsSystem(time, { maxExpandedPerUpdate: 0 }),
      ).toThrow(/maxExpandedPerUpdate/);
      expect(() =>
        createNavigationAgentEcsSystem(time, { maxExpandedPerUpdate: 2.5 }),
      ).toThrow(/maxExpandedPerUpdate/);
      expect(() =>
        createNavigationAgentEcsSystem(time, {
          maxExpandedPerUpdate: Infinity,
        }),
      ).not.toThrow();
    });

    it('throws naming the entity for a non-finite target or a bad speed', () => {
      const scene = createScene();
      const { agent } = scene.addUnit(
        { x: 0, y: 0 },
        createGridPathPlanner(createGrid(4, 4)),
        { target: { x: Number.NaN, y: 0 } },
      );

      expect(() => scene.step()).toThrow(/Navigation agent entity .* target/);

      agent.target = { x: 1, y: 1 };
      agent.speed = -3;
      expect(() => scene.step()).toThrow(/Navigation agent entity .* speed/);
    });
  });
});
