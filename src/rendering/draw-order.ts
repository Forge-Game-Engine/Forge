import { PositionEcsComponent, positionId } from '../common/index.js';
import { entityIndexMask } from '../ecs/entity-layout.js';
import { ParentEcsComponent, parentId } from '../ecs/hierarchy.js';
import { EcsWorld } from '../ecs/ecs-world.js';
import {
  DrawOrderEcsComponent,
  drawOrderId,
} from './components/draw-order-component.js';

/**
 * Each entity's place in the draw order, resolved from the hierarchy by
 * {@link createDrawOrderResolver}. Within a sprite or text `layer`, entities
 * draw by world order, then (for a camera that y-sorts) by their root's Y,
 * then by hierarchy order: roots in creation order, each followed by its
 * subtree in pre-order (parents before children, siblings in sibling
 * order).
 */
export interface DrawOrderResolver {
  /**
   * Resolves the draw order of every entity in `entityLists`, and of every
   * other entity in their roots' subtrees. Replaces the previous
   * resolution, so the readers below are only valid for these entities.
   * @param world - The ECS world the entities belong to.
   * @param entityLists - The entities to resolve.
   */
  resolve(world: EcsWorld, ...entityLists: (readonly number[])[]): void;

  /**
   * Reads an entity's world order: the sum of its own and its ancestors'
   * `DrawOrderEcsComponent.order`, clamped to a 32-bit integer.
   */
  worldOrder(entity: number): number;

  /**
   * Reads the creation sequence of an entity's topmost ancestor (or its
   * own, if it has no parent). An entity unparented with `removeParent`
   * goes back to its own creation sequence among the roots.
   */
  rootSequence(entity: number): number;

  /** Reads an entity's pre-order index within its root's subtree. The root itself is `0`. */
  hierarchyIndex(entity: number): number;

  /**
   * Reads the world Y of an entity's topmost ancestor, which y-sorting
   * orders its whole subtree by. `0` when that ancestor has no position.
   */
  rootY(entity: number): number;
}

// An entity's slot index, inlined rather than calling `entityIndex` since
// it's read several times per drawn entity every frame.
const indexMask = entityIndexMask;

const minWorldOrder = -0x80000000;
const maxWorldOrder = 0x7fffffff;

/**
 * Creates a {@link DrawOrderResolver}. Each one keeps its own buffers, so a
 * system that resolves draw order every frame doesn't allocate.
 * @returns The resolver.
 */
export function createDrawOrderResolver(): DrawOrderResolver {
  let stamp = 0;
  let stamps = new Uint32Array(0);
  let worldOrders = new Int32Array(0);
  let rootSequences = new Float64Array(0);
  let hierarchyIndices = new Uint32Array(0);
  let roots = new Float64Array(0);
  let getRootPosition:
    ((entity: number) => PositionEcsComponent | null) | null = null;
  const stack: number[] = [];
  const stackParentOrders: number[] = [];

  const ensureCapacity = (index: number): void => {
    if (index < stamps.length) {
      return;
    }

    const capacity = Math.max(64, stamps.length * 2, index + 1);

    const grow = <T extends Uint32Array | Int32Array | Float64Array>(
      buffer: T,
      create: (length: number) => T,
    ): T => {
      const grown = create(capacity);
      grown.set(buffer);

      return grown;
    };

    stamps = grow(stamps, (length) => new Uint32Array(length));
    worldOrders = grow(worldOrders, (length) => new Int32Array(length));
    rootSequences = grow(rootSequences, (length) => new Float64Array(length));
    hierarchyIndices = grow(
      hierarchyIndices,
      (length) => new Uint32Array(length),
    );
    roots = grow(roots, (length) => new Float64Array(length));
  };

  // An iterative pre-order walk of `root`'s subtree, so a deep hierarchy
  // can't overflow the call stack.
  const resolveSubtree = (
    world: EcsWorld,
    root: number,
    getDrawOrder: (entity: number) => DrawOrderEcsComponent | null,
  ): void => {
    const rootSequence = world.getCreationSequence(root);
    let nextHierarchyIndex = 0;

    stack.push(root);
    stackParentOrders.push(0);

    while (stack.length > 0) {
      const entity = stack.pop()!;
      const parentOrder = stackParentOrders.pop()!;
      const index = entity & indexMask;
      const order = Math.max(
        minWorldOrder,
        Math.min(
          maxWorldOrder,
          parentOrder + (getDrawOrder(entity)?.order ?? 0),
        ),
      );

      ensureCapacity(index);
      stamps[index] = stamp;
      worldOrders[index] = order;
      rootSequences[index] = rootSequence;
      hierarchyIndices[index] = nextHierarchyIndex++;
      roots[index] = root;

      const children = world.getChildren(entity);

      // Pushed last to first, so the first child is popped (and numbered)
      // first.
      for (let c = children.length - 1; c >= 0; c--) {
        stack.push(children[c]);
        stackParentOrders.push(order);
      }
    }
  };

  return {
    resolve: (world, ...entityLists) => {
      stamp = (stamp + 1) >>> 0;

      if (stamp === 0) {
        stamps.fill(0);
        stamp = 1;
      }

      const getDrawOrder =
        world.getComponentAccessor<DrawOrderEcsComponent>(drawOrderId);
      getRootPosition =
        world.getComponentAccessor<PositionEcsComponent>(positionId);
      const getParent =
        world.getComponentAccessor<ParentEcsComponent>(parentId);

      for (const entities of entityLists) {
        for (const entity of entities) {
          const index = entity & indexMask;

          // Resolving a root resolves its whole subtree, so an entity
          // already stamped this pass is done.
          if (index < stamps.length && stamps[index] === stamp) {
            continue;
          }

          let root = entity;

          for (
            let parent = getParent(root);
            parent !== null;
            parent = getParent(root)
          ) {
            root = parent.parent;
          }

          resolveSubtree(world, root, getDrawOrder);
        }
      }
    },
    worldOrder: (entity) => worldOrders[entity & indexMask],
    rootSequence: (entity) => rootSequences[entity & indexMask],
    hierarchyIndex: (entity) => hierarchyIndices[entity & indexMask],
    rootY: (entity) =>
      getRootPosition?.(roots[entity & indexMask])?.world.y ?? 0,
  };
}

const float64Scratch = new Float64Array(1);
const float64ScratchWords = new Uint32Array(float64Scratch.buffer);
// Which 32-bit word of a float64 holds its sign and exponent, so the split
// below works on either byte order.
const highWord = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1 ? 1 : 0;

/**
 * Writes a number as two unsigned 32-bit integers that sort, high then low,
 * the same as the number: its 64-bit float bits, with negative numbers'
 * bits flipped and positive numbers' sign bit set. Exact for every finite
 * number.
 * @param value - The number to map.
 * @param high - The array to write the more significant half into.
 * @param low - The array to write the less significant half into.
 * @param index - The index to write at.
 */
export function writeSortableFloat64(
  value: number,
  high: Uint32Array,
  low: Uint32Array,
  index: number,
): void {
  float64Scratch[0] = value;
  const highBits = float64ScratchWords[highWord];
  const lowBits = float64ScratchWords[1 - highWord];

  if (highBits & 0x80000000) {
    high[index] = ~highBits >>> 0;
    low[index] = ~lowBits >>> 0;

    return;
  }

  high[index] = (highBits | 0x80000000) >>> 0;
  low[index] = lowBits;
}

const float32Scratch = new Float32Array(1);
const float32ScratchBits = new Uint32Array(float32Scratch.buffer);

/**
 * Maps a number to an unsigned 32-bit integer with the same order, through
 * its 32-bit float bits: negative floats have their bits flipped and
 * positive ones their sign bit set. Exact for integers up to `2^24`.
 * @param value - The number to map.
 * @returns The sortable integer.
 */
export function float32ToSortableUint32(value: number): number {
  float32Scratch[0] = value;
  const bits = float32ScratchBits[0];

  return bits & 0x80000000 ? ~bits >>> 0 : (bits | 0x80000000) >>> 0;
}

/**
 * Maps a 32-bit signed integer to an unsigned one with the same order.
 * @param value - The integer to map.
 * @returns The sortable integer.
 */
export function int32ToSortableUint32(value: number): number {
  return (value ^ 0x80000000) >>> 0;
}

let digitCounts = new Uint32Array(0);

/**
 * Counts every byte of every key part in one pass over the items, so each
 * sorting pass only has to scatter.
 */
function countDigits(keyParts: readonly Uint32Array[], count: number): void {
  const size = keyParts.length * 4 * 256;

  if (digitCounts.length < size) {
    digitCounts = new Uint32Array(size);
  }

  digitCounts.fill(0, 0, size);

  for (let part = 0; part < keyParts.length; part++) {
    const keys = keyParts[part];
    const base = part * 1024;

    for (let i = 0; i < count; i++) {
      const key = keys[i];
      digitCounts[base + (key & 0xff)]++;
      digitCounts[base + 256 + ((key >>> 8) & 0xff)]++;
      digitCounts[base + 512 + ((key >>> 16) & 0xff)]++;
      digitCounts[base + 768 + (key >>> 24)]++;
    }
  }
}

/**
 * Stably sorts `source` into `destination` by one byte of each item's key,
 * using that byte's counts from `countDigits`.
 * @returns `false`, without writing `destination`, if every item has the
 * same byte there, so the pass would change nothing.
 */
function radixSortPass(
  keys: Uint32Array,
  shift: number,
  countsOffset: number,
  source: Uint32Array,
  destination: Uint32Array,
  count: number,
): boolean {
  if (
    count === 0 ||
    digitCounts[countsOffset + ((keys[0] >>> shift) & 0xff)] === count
  ) {
    return false;
  }

  let offset = 0;

  for (let digit = 0; digit < 256; digit++) {
    const digitCount = digitCounts[countsOffset + digit];
    digitCounts[countsOffset + digit] = offset;
    offset += digitCount;
  }

  for (let i = 0; i < count; i++) {
    const item = source[i];
    destination[digitCounts[countsOffset + ((keys[item] >>> shift) & 0xff)]++] =
      item;
  }

  return true;
}

/**
 * Sorts `count` items by unsigned 32-bit keys with a stable,
 * least-significant-digit-first radix sort, one byte at a time. A byte that
 * every item shares is skipped, so key parts that are all equal (every
 * sprite in layer `0`) cost almost nothing.
 * @param keyParts - One key array per part, most significant part first.
 * Item `i`'s key is `keyParts[0][i]`, then `keyParts[1][i]`, and so on.
 * @param count - The number of items.
 * @param order - A buffer for the result, at least `count` long.
 * @param scratch - A second buffer the sort swaps with, at least `count` long.
 * @returns Item indices in ascending key order, either `order` or `scratch`.
 */
export function radixSortByKeys(
  keyParts: readonly Uint32Array[],
  count: number,
  order: Uint32Array,
  scratch: Uint32Array,
): Uint32Array {
  let source = order;
  let destination = scratch;

  for (let i = 0; i < count; i++) {
    source[i] = i;
  }

  countDigits(keyParts, count);

  for (let part = keyParts.length - 1; part >= 0; part--) {
    for (let byte = 0; byte < 4; byte++) {
      const sorted = radixSortPass(
        keyParts[part],
        byte * 8,
        part * 1024 + byte * 256,
        source,
        destination,
        count,
      );

      if (sorted) {
        const swap = source;
        source = destination;
        destination = swap;
      }
    }
  }

  return source;
}
