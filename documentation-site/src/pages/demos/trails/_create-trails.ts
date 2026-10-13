import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addSpriteComponent,
  addTrailComponent,
  createImageSprite,
  RenderContext,
  Texture,
  TrailEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import {
  LoopingPathEcsComponent,
  loopingPathId,
} from './_looping-path.component';
import {
  applyTrailSettings,
  defaultTrailSettings,
  TrailName,
} from './_trail-settings';

const shipWidth = 70;

/** The demo's trails, and the entity of the one that follows the mouse. */
export interface DemoTrails {
  trails: Record<TrailName, TrailEcsComponent>;
  cursor: number;
  pattern: Texture;
}

/**
 * Creates an entity with a trail, set up from the trail's default settings.
 * @returns The entity and its trail.
 */
function createTrailEntity(
  world: EcsWorld,
  name: TrailName,
  pattern: Texture,
): { entity: number; trail: TrailEcsComponent } {
  const entity = world.createEntity();

  addPositionComponent(world, entity);

  const trail = addTrailComponent(world, entity);

  applyTrailSettings(trail, defaultTrailSettings[name], pattern);

  return { entity, trail };
}

function addLoopingPath(
  world: EcsWorld,
  entity: number,
  path: LoopingPathEcsComponent,
): void {
  world.addComponent(entity, loopingPathId, path);
}

/**
 * Creates the four trails: one the mouse moves, a textured one on a figure
 * eight, a glowing one on a circle, and one behind a ship.
 * @param world - The ECS world to add the trails to.
 * @param renderContext - The render context to load the textures with.
 * @returns The trails, for the page's settings to change.
 */
export async function createTrails(
  world: EcsWorld,
  renderContext: RenderContext,
): Promise<DemoTrails> {
  const [pattern, shipTexture] = await Promise.all([
    // `'tile'` mode repeats the texture along the trail, so it needs a
    // texture that wraps.
    renderContext.textureCache.getOrLoad(
      getAssetUrl('img/kenney_pattern-pack/PNG/Default/pattern_07.png'),
      { wrap: 'repeat' },
    ),
    renderContext.textureCache.getOrLoad(
      getAssetUrl('img/space-shooter/Spaceship_6.png'),
    ),
  ]);

  // Moved by the mouse (see follow-mouse.ts).
  const cursor = createTrailEntity(world, 'cursor', pattern);

  const textured = createTrailEntity(world, 'textured', pattern);

  addLoopingPath(world, textured.entity, {
    center: { x: -150, y: 40 },
    radius: { x: 130, y: 90 },
    speed: { x: 0.8, y: 1.6 },
    phase: 0,
  });

  const glowing = createTrailEntity(world, 'glowing', pattern);

  addLoopingPath(world, glowing.entity, {
    center: { x: 170, y: -110 },
    radius: { x: 90, y: 90 },
    speed: { x: 2, y: 2 },
    phase: Math.PI / 2,
  });

  // The trail is on the ship's entity, and the ship's sprite on a child of
  // it. A child draws after its parent, so the trail draws behind the ship,
  // and after the background, which was created first.
  const ship = createTrailEntity(world, 'ship', pattern);

  addRotationComponent(world, ship.entity);
  addLoopingPath(world, ship.entity, {
    center: { x: 0, y: 180 },
    radius: { x: 260, y: 50 },
    speed: { x: 0.5, y: 1.5 },
    phase: 0,
  });

  const shipSprite = world.createEntity();

  addPositionComponent(world, shipSprite);
  // The ship's image faces down (+Y). A quarter turn back makes it face its
  // parent's +X, which the looping path turns to the direction of travel.
  addRotationComponent(world, shipSprite, { local: -Math.PI / 2 });
  addSpriteComponent(
    world,
    shipSprite,
    createImageSprite(shipTexture, {
      pixelsPerUnit: shipTexture.width / shipWidth,
    }),
  );
  world.setParent(shipSprite, ship.entity);

  return {
    trails: {
      cursor: cursor.trail,
      textured: textured.trail,
      glowing: glowing.trail,
      ship: ship.trail,
    },
    cursor: cursor.entity,
    pattern,
  };
}
