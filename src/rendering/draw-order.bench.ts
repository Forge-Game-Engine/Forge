import { bench, describe } from 'vitest';
import { Random } from '../math/index.js';
import { float32ToSortableUint32, radixSortByKeys } from './draw-order.js';

const itemCounts = [1_000, 10_000, 100_000];

interface SortInput {
  keyParts: Uint32Array[];
  order: Uint32Array;
  scratch: Uint32Array;
}

/**
 * Builds the five key parts the render system sorts sprites by, with the
 * spread a typical scene has: a handful of layers, one world order, root
 * creation sequences in shuffled order, and small hierarchy indices.
 */
function createSortInput(count: number): SortInput {
  const random = new Random('draw-order-bench');
  const layers = new Uint32Array(count);
  const worldOrders = new Uint32Array(count).fill(0x80000000);
  const sequencesHigh = new Uint32Array(count);
  const sequencesLow = new Uint32Array(count);
  const hierarchyIndices = new Uint32Array(count);

  for (let i = 0; i < count; i++) {
    layers[i] = float32ToSortableUint32(random.randomInt(0, 4));
    sequencesLow[i] = i;
    hierarchyIndices[i] = random.randomInt(0, 8);
  }

  // Shuffle the creation sequences, so the sort has to move items.
  for (let i = count - 1; i > 0; i--) {
    const j = random.randomInt(0, i);
    const swap = sequencesLow[i];

    sequencesLow[i] = sequencesLow[j];
    sequencesLow[j] = swap;
  }

  return {
    keyParts: [
      layers,
      worldOrders,
      sequencesHigh,
      sequencesLow,
      hierarchyIndices,
    ],
    order: new Uint32Array(count),
    scratch: new Uint32Array(count),
  };
}

describe('radix sort of draw order keys', () => {
  for (const count of itemCounts) {
    const { keyParts, order, scratch } = createSortInput(count);

    bench(`${count.toLocaleString('en-US')} items`, () => {
      radixSortByKeys(keyParts, count, order, scratch);
    });
  }
});
