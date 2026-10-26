import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addColliderComponent,
  addGravityComponent,
  addRevoluteJointComponent,
  addRigidBodyComponent,
  CircleCollider,
  Collider,
  PolygonCollider,
  RigidBodyOptions,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  createImageSprite,
  NineSliceOptions,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { rectangleVertices, SleepingLevel } from './_create-level';

const gravity = { x: 0, y: 400 };

const pyramidRows = 6;
const boxSize = 36;

// Boxes in a row sit a few units apart. Two sleeping bodies whose bounds
// overlap without touching have no recorded contact, so the narrow phase
// tests them on every step even while they sleep; the gap keeps that from
// happening inside the settled pyramid.
const boxGap = 4;

/** How wide the pyramid's bottom row is. */
export const pyramidWidth = pyramidRows * (boxSize + boxGap) - boxGap;

const plankCount = 4;
const plankLength = 52;
const plankThickness = 16;
// Each joint sits in the gap between two planks, so neighbors don't
// collide with each other while the chain lies straight.
const plankSpacing = 60;

const ballRadius = 22;

// `block_square.png` is a 64x64 rounded panel; these insets keep its
// corners and bolts the same size when it's stretched into a plank.
const squareSlices: NineSliceOptions = {
  left: 16,
  right: 16,
  top: 16,
  bottom: 16,
  nativeWidth: 64,
  nativeHeight: 64,
};

interface BodySprites {
  box: SpriteEcsComponent;
  plank: SpriteEcsComponent;
  ball: SpriteEcsComponent;
}

async function loadSprites(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<BodySprites> {
  const { textureCache } = renderContext;

  const [boxTexture, ballTexture] = await Promise.all([
    textureCache.getOrLoad(getAssetUrl('img/physics/block_square.png')),
    textureCache.getOrLoad(getAssetUrl('img/physics/ball_blue_large.png')),
  ]);

  return {
    box: {
      ...createImageSprite(boxTexture, { pixelsPerUnit: 1 }),
      category: renderLayer,
    },
    plank: {
      ...createImageSprite(boxTexture, {
        pixelsPerUnit: 1,
        slices: squareSlices,
      }),
      category: renderLayer,
    },
    ball: {
      ...createImageSprite(ballTexture, { pixelsPerUnit: 1 }),
      category: renderLayer,
    },
  };
}

/**
 * Creates a dynamic body that falls under gravity.
 * @returns The body's entity.
 */
function createBody(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  collider: Collider,
  position: Vector2,
  size: Vector2,
  rigidBody: RigidBodyOptions = {},
): number {
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: position });
  addRotationComponent(world, entity);
  addSpriteComponent(world, entity, {
    ...sprite,
    width: size.x,
    height: size.y,
  });
  addColliderComponent(world, entity, { collider, friction: 0.6 });
  addRigidBodyComponent(world, entity, rigidBody);
  addGravityComponent(world, entity, { amount: gravity });

  return entity;
}

/**
 * Stacks a pyramid of boxes on the trapdoor. Every box touches its
 * neighbors above and below, so the whole pyramid is one island: it falls
 * asleep together and wakes together.
 */
function createPyramid(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  shelfTop: number,
): void {
  const pitch = boxSize + boxGap;

  for (let row = 0; row < pyramidRows; row++) {
    const count = pyramidRows - row;
    const y = shelfTop - boxSize / 2 - row * boxSize;

    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * pitch;

      createBody(
        world,
        sprite,
        new PolygonCollider(rectangleVertices(boxSize, boxSize)),
        { x, y },
        { x: boxSize, y: boxSize },
      );
    }
  }
}

/**
 * Drops a chain of planks joined end to end by revolute joints. The joints
 * link the planks into one island even where they don't touch.
 */
function createChain(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  start: Vector2,
): void {
  let previous: number | null = null;

  for (let i = 0; i < plankCount; i++) {
    const plank = createBody(
      world,
      sprite,
      new PolygonCollider(rectangleVertices(plankLength, plankThickness)),
      { x: start.x + i * plankSpacing, y: start.y },
      { x: plankLength, y: plankThickness },
    );

    if (previous !== null) {
      addRevoluteJointComponent(world, world.createEntity(), {
        entityA: previous,
        entityB: plank,
        localAnchorA: { x: plankSpacing / 2, y: 0 },
        localAnchorB: { x: -plankSpacing / 2, y: 0 },
      });
    }

    previous = plank;
  }
}

/**
 * Creates the demo's bodies: a pyramid of boxes on the trapdoor, a chain of
 * jointed planks dropped onto the shelf to its left, and a ball on the
 * shelf to its right that can never sleep.
 * @param world - The ECS world to add the bodies to.
 * @param renderContext - The render context used to load the body sprites.
 * @param renderLayer - The render layer the bodies are drawn on.
 * @param level - Where the shelf and trapdoor are.
 */
export async function createBodies(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  level: SleepingLevel,
): Promise<void> {
  const sprites = await loadSprites(renderContext, renderLayer);
  const { shelfTop, trapdoorLeft, trapdoorRight, innerLeft, innerRight } =
    level;

  createPyramid(world, sprites.box, shelfTop);

  const chainLength = (plankCount - 1) * plankSpacing;
  const leftShelfCenter = (innerLeft + trapdoorLeft) / 2;

  createChain(world, sprites.plank, {
    x: leftShelfCenter - chainLength / 2,
    y: shelfTop - 120,
  });

  // A body that can't sleep keeps its whole island awake, so the ball sits
  // on its own, where it touches nothing but the shelf.
  createBody(
    world,
    sprites.ball,
    new CircleCollider(ballRadius),
    { x: (trapdoorRight + innerRight) / 2, y: shelfTop - ballRadius },
    { x: ballRadius * 2, y: ballRadius * 2 },
    { canSleep: false },
  );
}
