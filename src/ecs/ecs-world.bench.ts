import { bench, describe } from 'vitest';
import { createEcsBenchScene } from './test-helpers/ecs-bench-scene.js';
import { measureTickMemory } from './test-helpers/measure-tick-memory.js';

const entityCount = 100_000;
const systemCount = 20;

// Each tick replaces `replacedPerTick(tick)` entities, then runs the world.
const scenarios = [
  { name: 'still', replacedPerTick: (): number => 0, memoryTicks: 200 },
  {
    name: '1% churn',
    replacedPerTick: (): number => entityCount / 100,
    memoryTicks: 200,
  },
  {
    name: '1% churn every other tick',
    replacedPerTick: (tick: number): number =>
      tick % 2 === 0 ? entityCount / 100 : 0,
    memoryTicks: 200,
  },
  {
    name: 'full churn',
    replacedPerTick: (): number => entityCount,
    memoryTicks: 15,
  },
];

const buildScene = (): ReturnType<typeof createEcsBenchScene> => {
  const scene = createEcsBenchScene(entityCount, systemCount);

  // The first tick reports every match as added; leave it out.
  scene.world.update();

  return scene;
};

// Vitest's `bench` only times, so the heap is measured here, once per
// scenario, and printed beside the timings. The scene's heap includes its
// component objects.
const megabytes = (bytes: number): string => `${(bytes / 1e6).toFixed(1)} MB`;

console.table(
  Object.fromEntries(
    scenarios.map(({ name, replacedPerTick, memoryTicks }) => {
      const memory = measureTickMemory(
        buildScene,
        (scene, tick) => {
          scene.replaceEntities(replacedPerTick(tick));
          scene.world.update();
        },
        memoryTicks,
      );

      return [
        name,
        {
          sceneHeap: megabytes(memory.retainedBytes),
          medianBytesPerTick: memory.medianBytesPerTick,
          maxBytesPerTick: memory.maxBytesPerTick,
          ticksMeasured: memory.ticks,
        },
      ];
    }),
  ),
);

describe(`EcsWorld, ${entityCount} entities, ${systemCount} overlapping systems`, () => {
  for (const { name, replacedPerTick } of scenarios) {
    const scene = buildScene();
    let tick = 0;

    bench(name, () => {
      scene.replaceEntities(replacedPerTick(tick++));
      scene.world.update();
    });
  }
});
