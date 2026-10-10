import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

/** What {@link measureTickMemory} found. */
export interface TickMemory {
  /** Heap the scene holds once built, in bytes, after a full collection. */
  retainedBytes: number;

  /** The median bytes allocated by one tick. */
  medianBytesPerTick: number;

  /** The most bytes allocated by one tick. */
  maxBytesPerTick: number;

  /** How many ticks were measured. */
  ticks: number;
}

const usedHeap = (): number => process.memoryUsage().heapUsed;

/**
 * Measures, in Node, how much heap a scene holds and how much each of its
 * ticks allocates, from the heap's size before and after each tick. A tick
 * during which the garbage collector ran is left out, since the heap shrank
 * during it. The heap size includes what reading it allocates, which is
 * measured on its own and subtracted.
 * @param build - Builds the scene; whatever it returns stays alive while
 * the ticks run.
 * @param tick - Runs one tick of the scene.
 * @param ticks - How many ticks to measure, after a warm-up.
 * @returns The measurements.
 */
export const measureTickMemory = <T>(
  build: () => T,
  tick: (scene: T, tickIndex: number) => void,
  ticks: number,
): TickMemory => {
  setFlagsFromString('--expose-gc');

  const collectGarbage = runInNewContext('gc') as () => void;

  collectGarbage();

  const heapBefore = usedHeap();
  const scene = build();

  collectGarbage();

  const retainedBytes = usedHeap() - heapBefore;

  // Grows every array to the scene's size, and lets V8 optimize the tick.
  for (let i = 0; i < 30; i++) {
    tick(scene, i);
  }

  let readCost = Infinity;

  for (let i = 0; i < 50; i++) {
    const before = usedHeap();

    readCost = Math.min(readCost, usedHeap() - before);
  }

  collectGarbage();

  const samples: number[] = [];

  for (let i = 0; i < ticks; i++) {
    const before = usedHeap();

    tick(scene, i);

    const allocated = usedHeap() - before - readCost;

    if (allocated >= 0) {
      samples.push(allocated);
    }
  }

  samples.sort((a, b) => a - b);

  return {
    retainedBytes,
    medianBytesPerTick: samples[samples.length >> 1] ?? 0,
    maxBytesPerTick: samples[samples.length - 1] ?? 0,
    ticks: samples.length,
  };
};
