import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addFlipComponent,
  addPositionComponent,
  FlipEcsComponent,
  PositionEcsComponent,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addSpriteComponent,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  addSpriteAnimationComponent,
  AnimationClip,
  createSpriteSheet,
  selectAnimationFrames,
  SpriteAnimationEcsComponent,
} from '@forge-game-engine/forge/animations';
import { AssetRegistry } from '@forge-game-engine/forge/asset-loading';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

// `adventurer_spritesheet.png` is a 416x256 sheet of 32x32 frames: 13
// columns x 8 rows. Row 0 is an idle/breathing loop (13 frames); row 1 is a
// run cycle (8 frames).
const spriteSheetColumns = 13;
const spriteSheetRows = 8;
const frameSizeInPixels = 32;
const idleFrameCount = 13;
const runFrameCount = 8;
const runRowStartFrameIndex = spriteSheetColumns;
const frameDurationMilliseconds = 90;

// Scaled well past the sheet's native 32x32 so the character is legible
// against the demo's fixed-size viewport.
export const playerDisplaySize = frameSizeInPixels * 5;

export interface Player {
  /** The character entity's position - written directly by the movement system. */
  position: PositionEcsComponent;
  /** Mirrors the character horizontally when moving left. */
  flip: FlipEcsComponent;
  /** The character's active sprite animation clip and frame. */
  spriteAnimation: SpriteAnimationEcsComponent;
  /** The idle clip's handle in `animationRegistry`. */
  idleAnimationHandle: number;
  /** The run clip's handle in `animationRegistry`. */
  runAnimationHandle: number;
}

/**
 * Loads the adventurer sprite sheet, slices it into an idle clip (row 0) and
 * a run clip (row 1), registers both in `animationRegistry`, and creates the
 * character entity starting in the idle clip - see the Sprite Animations
 * guide for the full walkthrough this demo follows.
 * @param world - The ECS world to add the character entity to.
 * @param renderContext - The render context used to load the sprite sheet.
 * @param renderLayer - The render layer the character should be drawn on.
 * @param animationRegistry - The registry to register the idle/run clips in.
 */
export async function createPlayer(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  animationRegistry: AssetRegistry<AnimationClip>,
): Promise<Player> {
  const characterImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/adventurer_spritesheet.png'),
  );

  const characterSprite = createImageSprite(
    characterImage,
    renderContext,
    renderLayer,
    {
      frameDimensions: new Vector2(frameSizeInPixels, frameSizeInPixels),
      pixelated: true,
    },
  );

  const spriteSheet = createSpriteSheet(
    characterImage,
    spriteSheetRows,
    spriteSheetColumns,
  );

  // `frameDimensions` above only sizes the sprite's on-screen quad;
  // `createImageSprite` always leaves `uvScale` at its (1, 1) default (the
  // whole texture), so it's set here from the sheet's own per-frame UV
  // size, or every frame would sample (and squash) the entire sheet instead
  // of a single 32x32 cell - see the Sprite Animations guide.
  characterSprite.uvScale = spriteSheet.frames[0][0].dimensions.clone();

  const idleAnimationHandle = animationRegistry.register(
    'idle',
    new AnimationClip(selectAnimationFrames(spriteSheet, idleFrameCount, 0)),
  );

  const runAnimationHandle = animationRegistry.register(
    'run',
    new AnimationClip(
      selectAnimationFrames(spriteSheet, runFrameCount, runRowStartFrameIndex),
    ),
  );

  const entity = world.createEntity();

  const position = addPositionComponent(world, entity, {
    local: new Vector2(0, 0),
    world: new Vector2(0, 0),
  });

  addSpriteComponent(world, entity, {
    ...characterSprite,
    width: playerDisplaySize,
    height: playerDisplaySize,
  });

  const flip = addFlipComponent(world, entity);

  const spriteAnimation = addSpriteAnimationComponent(world, entity, {
    animationClipHandle: idleAnimationHandle,
    frameDurationMilliseconds,
  });

  return {
    position,
    flip,
    spriteAnimation,
    idleAnimationHandle,
    runAnimationHandle,
  };
}
