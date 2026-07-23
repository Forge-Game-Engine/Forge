import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addPhysicsBodyComponent,
  PolygonShape,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  Color,
  combineInstanceDataSegments,
  createQuadGeometry,
  createTextureFromImage,
  ForgeShaderSource,
  Material,
  Renderable,
  RenderContext,
  SpriteEcsComponent,
  spriteInstanceDataSegment,
} from '@forge-game-engine/forge/rendering';
import { PlayArea } from './_create-boundaries';
import { brickId } from './_brick.component';
import { brickShader } from './_brick.shader';

/**
 * The brick images available to cycle through, row by row.
 */
const brickImagePaths = [
  'img/brick-breaker/brick-yellow.png',
  'img/brick-breaker/brick-blue.png',
  'img/brick-breaker/brick-pink.png',
  'img/brick-breaker/brick-orange.png',
];

const rows = 12;

/**
 * Per-row brick configuration: the image to use as the sprite's texture, and
 * the custom fragment shader that gives the row its look.
 */
const brickRows = Array.from({ length: rows }, (_, row) => ({
  imagePath: brickImagePaths[row % brickImagePaths.length],
  fragmentShaderSource: brickShader,
  fragmentShaderName: 'brick.frag',
}));

const columns = 24;
const columnGapFraction = 0.15;
const rowGapFraction = 0.2;

/**
 * Tracks the bricks currently alive in the play area, and respawns a fresh
 * grid once the last one is destroyed, so the demo keeps going indefinitely.
 */
export interface BrickField {
  /**
   * Whether `entity` is a currently-alive brick.
   * @param entity - The entity to check.
   */
  has(entity: number): boolean;

  /**
   * Removes `entity` from the world and this field.
   * @param entity - The brick entity to destroy.
   */
  destroy(entity: number): void;
}

/**
 * Creates a brick sprite that reuses the default sprite vertex shader, but
 * renders with a custom fragment shader, so different rows of bricks can
 * have their own look (e.g. shiny, flaming).
 * @param image - The brick image to use as the sprite's texture.
 * @param renderContext - The render context used to build the material.
 * @param layer - The render layer the sprite should be drawn on.
 * @param fragmentShaderSource - The raw source of the custom fragment shader.
 * @param fragmentShaderName - The fragment shader's `#property name` value.
 * @returns The created sprite.
 */
function createBrickSprite(
  image: HTMLImageElement,
  renderContext: RenderContext,
  layer: number,
  fragmentShaderSource: string,
  fragmentShaderName: string,
): SpriteEcsComponent {
  const { shaderCache, gl } = renderContext;

  shaderCache.addShader(new ForgeShaderSource(fragmentShaderSource));

  const vertexShader = shaderCache.getShader('sprite.vert');
  const fragmentShader = shaderCache.getShader(fragmentShaderName);

  const material = new Material(vertexShader, fragmentShader, gl);

  material.setUniform('u_texture', createTextureFromImage(gl, image, true));
  material.setUniform('u_time', 0);

  const { floatsPerInstance, bindInstanceData, setupInstanceAttributes } =
    combineInstanceDataSegments(spriteInstanceDataSegment);

  const renderable = new Renderable(
    createQuadGeometry(gl),
    material,
    floatsPerInstance,
    layer,
    bindInstanceData,
    setupInstanceAttributes,
  );

  return {
    enabled: true,
    width: image.width,
    height: image.height,
    pivot: new Vector2(0.5, 0.5),
    tintColor: Color.white,
    renderable,
    uvOffset: new Vector2(0, 0),
    uvScale: new Vector2(1, 1),
    layer,
  };
}

/**
 * Creates a grid of single-hit, static bricks spanning the play area.
 * @param world - The ECS world to add the brick entities to.
 * @param renderContext - The render context used to load the brick sprites.
 * @param renderLayer - The render layer the bricks should be drawn on.
 * @param playArea - The bounds the brick grid is laid out within.
 * @returns A field for tracking and destroying the spawned bricks.
 */
export async function createBrickField(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  playArea: PlayArea,
): Promise<BrickField> {
  const sprites = await Promise.all(
    brickRows.map(
      async ({ imagePath, fragmentShaderSource, fragmentShaderName }) =>
        createBrickSprite(
          await renderContext.imageCache.getOrLoad(getAssetUrl(imagePath)),
          renderContext,
          renderLayer,
          fragmentShaderSource,
          fragmentShaderName,
        ),
    ),
  );

  const liveBricks = new Set<number>();

  const spawnBrick = (
    sprite: SpriteEcsComponent,
    position: Vector2,
    width: number,
    height: number,
  ): void => {
    const entity = world.createEntity();
    const scale = width / sprite.width;

    addPositionComponent(world, entity, {
      local: position.clone(),
      world: position.clone(),
    });

    addRotationComponent(world, entity);

    addScaleComponent(world, entity, {
      local: new Vector2(scale, scale),
      world: new Vector2(scale, scale),
    });

    addSpriteComponent(world, entity, sprite);

    world.addTag(entity, brickId);

    addPhysicsBodyComponent(world, entity, {
      physicsBody: new RigidBody({
        shape: PolygonShape.rectangle(width, height),
        position: position.clone(),
        isStatic: true,
        restitution: 1,
        friction: 0,
      }),
    });

    liveBricks.add(entity);
  };

  const spawnGrid = (): void => {
    const playAreaWidth = playArea.maxX - playArea.minX;
    const brickWidth =
      playAreaWidth / (columns + (columns - 1) * columnGapFraction);
    const columnGap = brickWidth * columnGapFraction;
    const startX = playArea.minX + brickWidth / 2;

    for (const [row, sprite] of sprites.entries()) {
      const brickHeight = brickWidth * (sprite.height / sprite.width);
      const rowGap = brickHeight * rowGapFraction;
      const y = playArea.topY - rowGap - row * (brickHeight + rowGap);

      for (let column = 0; column < columns; column++) {
        const x = startX + column * (brickWidth + columnGap);

        spawnBrick(sprite, new Vector2(x, y), brickWidth, brickHeight);
      }
    }
  };

  spawnGrid();

  return {
    has: (entity) => liveBricks.has(entity),
    destroy: (entity) => {
      world.removeEntity(entity);
      liveBricks.delete(entity);

      if (liveBricks.size === 0) {
        spawnGrid();
      }
    },
  };
}
