import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import {
  addSpriteComponent,
  createAtlasSprite,
  TextureAtlas,
} from '@forge-game-engine/forge/rendering';
import { burningShipPosition } from './_create-burning-ship';

// One atlas texel is one world unit, and the camera shows 600 world units
// vertically, so the art draws at its own size in the demo box.
const pixelsPerUnit = 1;
const tileSize = 64;

// The island's nine tiles, in row-major order: corners, edges and middle.
const islandTiles = [
  ['island_1', 'island_2', 'island_3'],
  ['island_4', 'island_5', 'island_6'],
  ['island_7', 'island_8', 'island_9'],
];

const islands = [
  {
    x: -250,
    y: 70,
    props: [
      { name: 'palm_2', x: -30, y: -25 },
      { name: 'palm_1', x: 35, y: 20 },
      { name: 'sprig_2', x: -40, y: 45 },
      { name: 'sprig_1', x: 45, y: -45 },
      { name: 'mossy_rock_3', x: 10, y: 55 },
    ],
  },
  {
    x: 270,
    y: -70,
    props: [
      { name: 'palm_2', x: 25, y: 10 },
      { name: 'palm_3', x: -40, y: -30 },
      { name: 'sprig_2', x: -30, y: 40 },
      { name: 'mossy_rock_1', x: 45, y: -45 },
      { name: 'palm_1', x: -5, y: -55 },
    ],
  },
];

const ships = [
  { name: 'ship_5', x: -20, y: -170, angle: -1.9 },
  { name: 'ship_3', x: 400, y: 170, angle: 2.6 },
  { name: 'dinghy_1', x: 120, y: -190, angle: 0.4 },
  { name: 'dinghy_2', x: 150, y: -150, angle: 0.7 },
];

const rockNames = [
  'rock_1',
  'rock_2',
  'rock_3',
  'mossy_rock_1',
  'mossy_rock_2',
  'mossy_rock_3',
];
const rockCount = 30;
const flotsamNames = [
  'plank_1',
  'plank_2',
  'plank_3',
  'plank_4',
  'cannon_ball',
];
const flotsamCount = 14;

// Places to keep clear of rocks: the islands, the ships and the UI panel in
// the top-left corner.
const clearAreas = [
  ...islands.map(({ x, y }) => ({ x, y, radius: 150 })),
  ...ships.map(({ x, y }) => ({ x, y, radius: 80 })),
  { ...burningShipPosition, radius: 120 },
  { x: -400, y: -250, radius: 160 },
];

/**
 * A seeded pseudo-random number generator (mulberry32), so the props land
 * in the same places on every load.
 */
function createRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function isClear(x: number, y: number): boolean {
  return clearAreas.every(
    (area) => Math.hypot(x - area.x, y - area.y) > area.radius,
  );
}

function addProp(
  world: EcsWorld,
  atlas: TextureAtlas,
  renderLayer: number,
  prop: { name: string; x: number; y: number; angle?: number },
): void {
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: { x: prop.x, y: prop.y } });
  addRotationComponent(world, entity, { local: prop.angle ?? 0 });
  addSpriteComponent(world, entity, {
    // The region is looked up by its name in the TexturePacker file.
    ...createAtlasSprite(atlas, prop.name, { pixelsPerUnit }),
    category: renderLayer,
  });
}

/**
 * Draws the scene's props from the atlas by region name: two islands built
 * from nine tiles each, with palms and rocks on them, rocks scattered
 * across the sea, planks and cannonballs floating around the burning ship,
 * and a few ships. Each sprite is sized to its region's untrimmed frame,
 * so trimmed tiles still line up edge to edge.
 * @param world - The world to add the props to.
 * @param atlas - The atlas to draw them from.
 * @param renderLayer - The category of the camera that draws them.
 */
export function spawnProps(
  world: EcsWorld,
  atlas: TextureAtlas,
  renderLayer: number,
): void {
  const random = createRandom(816);

  for (const island of islands) {
    for (const [row, names] of islandTiles.entries()) {
      for (const [column, name] of names.entries()) {
        addProp(world, atlas, renderLayer, {
          name,
          x: island.x + (column - 1) * tileSize,
          y: island.y + (row - 1) * tileSize,
        });
      }
    }

    for (const prop of island.props) {
      addProp(world, atlas, renderLayer, {
        name: prop.name,
        x: island.x + prop.x,
        y: island.y + prop.y,
      });
    }
  }

  let rocks = 0;

  while (rocks < rockCount) {
    const x = (random() - 0.5) * 940;
    const y = (random() - 0.5) * 560;

    if (isClear(x, y)) {
      addProp(world, atlas, renderLayer, {
        name: rockNames[Math.floor(random() * rockNames.length)],
        x,
        y,
        angle: random() * Math.PI * 2,
      });
      rocks++;
    }
  }

  for (let index = 0; index < flotsamCount; index++) {
    const angle = random() * Math.PI * 2;
    const distance = 70 + random() * 60;

    addProp(world, atlas, renderLayer, {
      name: flotsamNames[index % flotsamNames.length],
      x: burningShipPosition.x + Math.cos(angle) * distance,
      y: burningShipPosition.y + Math.sin(angle) * distance,
      angle: random() * Math.PI * 2,
    });
  }

  for (const ship of ships) {
    addProp(world, atlas, renderLayer, ship);
  }
}
