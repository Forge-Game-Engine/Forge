import { Random } from '../../math/random.js';
import { Vector2 } from '../../math/vector2.js';
import { ParticleSpawnShape } from '../components/particle-emitter.js';

type SpawnShapesByType = {
  [TType in ParticleSpawnShape['type']]: Extract<
    ParticleSpawnShape,
    { type: TType }
  >;
};

type SpawnShapeSamplers = {
  [TType in keyof SpawnShapesByType]: (
    shape: SpawnShapesByType[TType],
    random: Random,
  ) => Vector2;
};

const fullTurn = Math.PI * 2;

const spawnShapeSamplers: SpawnShapeSamplers = {
  point: () => ({ x: 0, y: 0 }),
  circle: ({ radius }, random) => {
    // The square root spreads points evenly over the circle's area; a plain
    // random distance would bunch them up near the center.
    const distance = radius * Math.sqrt(random.randomFloat(0, 1));
    const angle = random.randomFloat(0, fullTurn);

    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  },
  ring: ({ radius }, random) => {
    const angle = random.randomFloat(0, fullTurn);

    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  },
  box: ({ width, height }, random) => ({
    x: random.randomFloat(-width / 2, width / 2),
    y: random.randomFloat(-height / 2, height / 2),
  }),
};

/**
 * Picks a random point inside `shape`, relative to the shape's center.
 * @param shape - The shape to pick a point in.
 * @param random - The random instance used to pick the point.
 * @returns The picked point, as an offset from the shape's center.
 */
export function sampleSpawnShape(
  shape: ParticleSpawnShape,
  random: Random,
): Vector2 {
  return sampleSpawnShapeOfType(shape, random);
}

function sampleSpawnShapeOfType<TType extends keyof SpawnShapesByType>(
  shape: SpawnShapesByType[TType],
  random: Random,
): Vector2 {
  const sampler: SpawnShapeSamplers[TType] = spawnShapeSamplers[shape.type];

  return sampler(shape, random);
}
