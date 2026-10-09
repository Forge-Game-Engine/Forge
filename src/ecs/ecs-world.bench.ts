import { bench, describe } from 'vitest';
import { createComponentId } from './ecs-component.js';
import { EcsWorld } from './ecs-world.js';

interface Point {
  x: number;
  y: number;
}

interface Velocity {
  dx: number;
  dy: number;
}

const pointId = createComponentId<Point>('benchPoint');
const velocityId = createComponentId<Velocity>('benchVelocity');
const markerId = createComponentId<number>('benchMarker');

const entityCounts = [1_000, 10_000, 100_000];

// The measured functions write what they computed here, so the work can't
// be optimized away.
const sink = new Float64Array(1);

/**
 * Builds a world of `count` entities that all have a point and a velocity,
 * and of as many again that have only a point, so a query for both
 * components skips half the entities it could drive from.
 */
function createWorld(count: number): EcsWorld {
  const world = new EcsWorld();

  for (let i = 0; i < count; i++) {
    const moving = world.createEntity();

    world.addComponent(moving, pointId, { x: i, y: -i });
    world.addComponent(moving, velocityId, { dx: 1, dy: 1 });

    const still = world.createEntity();

    world.addComponent(still, pointId, { x: i, y: i });
    world.addComponent(still, markerId, i);
  }

  return world;
}

for (const count of entityCounts) {
  describe(`${count.toLocaleString('en-US')} matching entities`, () => {
    const world = createWorld(count);

    world.addSystem<[Point, Velocity]>({
      name: 'benchMove',
      query: [pointId, velocityId],
      update: (_world, { components: [points, velocities] }) => {
        for (let i = 0; i < points.length; i++) {
          points[i].x += velocities[i].dx;
          points[i].y += velocities[i].dy;
        }
      },
    });

    bench('query', () => {
      sink[0] = world.query<[Point, Velocity]>([
        pointId,
        velocityId,
      ]).entities.length;
    });

    bench('query and iterate', () => {
      const {
        components: [points, velocities],
      } = world.query<[Point, Velocity]>([pointId, velocityId]);
      let sum = 0;

      for (let i = 0; i < points.length; i++) {
        sum += points[i].x * velocities[i].dx;
      }

      sink[0] = sum;
    });

    bench('update with one system', () => {
      world.update();
    });
  });
}
