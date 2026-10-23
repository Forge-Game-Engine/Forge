import { beforeEach, describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { PathPlanner } from '../path-planner.js';
import {
  addNavigationAgentComponent,
  navigationAgentId,
} from './navigation-agent-component.js';

const planner: PathPlanner = {
  version: 0,
  maxPathDistance: Infinity,
  planPath: () => ({ status: 'unreachable', points: [], expanded: 0 }),
};

describe('addNavigationAgentComponent', () => {
  let world: EcsWorld;
  let entity: number;

  beforeEach(() => {
    world = new EcsWorld();
    entity = world.createEntity();
  });

  it('applies defaults and starts every output idle', () => {
    const agent = addNavigationAgentComponent(world, entity, {
      planner,
      speed: 50,
    });

    expect(agent).toEqual({
      planner,
      speed: 50,
      target: null,
      arrivalRadius: 0,
      status: 'idle',
      path: [],
      waypointIndex: 0,
      desiredVelocity: { x: 0, y: 0 },
      pathStatus: null,
      plannedTarget: null,
      plannedPlanner: null,
      plannedVersion: -1,
      requestedFrame: null,
    });
  });

  it('takes the target and arrival radius given', () => {
    const target = { x: 3, y: 4 };
    const agent = addNavigationAgentComponent(world, entity, {
      planner,
      speed: 50,
      target,
      arrivalRadius: 8,
    });

    expect(agent.target).toBe(target);
    expect(agent.arrivalRadius).toBe(8);
  });

  it('returns the attached component', () => {
    const agent = addNavigationAgentComponent(world, entity, {
      planner,
      speed: 50,
    });

    expect(world.getComponent(entity, navigationAgentId)).toBe(agent);
  });

  it('gives every agent its own desired velocity', () => {
    const first = addNavigationAgentComponent(world, entity, {
      planner,
      speed: 50,
    });
    const second = addNavigationAgentComponent(world, world.createEntity(), {
      planner,
      speed: 50,
    });

    expect(first.desiredVelocity).not.toBe(second.desiredVelocity);
    expect(first.path).not.toBe(second.path);
  });

  it('throws for a negative or non-finite speed or arrival radius', () => {
    expect(() =>
      addNavigationAgentComponent(world, entity, { planner, speed: -1 }),
    ).toThrow(/speed/);
    expect(() =>
      addNavigationAgentComponent(world, entity, {
        planner,
        speed: Infinity,
      }),
    ).toThrow(/speed/);
    expect(() =>
      addNavigationAgentComponent(world, entity, {
        planner,
        speed: 1,
        arrivalRadius: Number.NaN,
      }),
    ).toThrow(/arrivalRadius/);
  });
});
