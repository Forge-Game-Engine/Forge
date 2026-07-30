import {
  actionResetTypes,
  addFlipComponent,
  addPositionComponent,
  addSpriteAnimationComponent,
  addSpriteComponent,
  AnimationClip,
  AssetRegistry,
  Axis1dAction,
  Color,
  createCamera,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createSpriteAnimationEcsSystem,
  createSpriteSheet,
  createTransformEcsSystem,
  EcsSystem,
  EcsWorld,
  KeyboardAxis1dBinding,
  KeyboardInputSource,
  keyCodes,
  PositionEcsComponent,
  positionId,
  registerInputs,
  selectAnimationFrames,
  Time,
  Vector2,
} from '../../../src/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;
const moveSpeedInWorldUnitsPerSecond = 150;

// `adventurer.png` (see AGENTS.md's "Adding a new scenario" - a copy lives
// under `e2e/fixtures/` rather than referencing `/demo`'s or
// `/documentation-site`'s asset folders, keeping `/e2e` dependent only on
// `/src`) is a 416x256 sheet of 32x32 frames: 13 columns x 8 rows. Row 0 is
// an idle/breathing loop (13 frames); row 1 is a run cycle (8 frames).
const spriteSheetColumns = 13;
const spriteSheetRows = 8;
const frameSizeInPixels = 32;
const idleFrameCount = 13;
const runFrameCount = 8;
const runRowStartFrameIndex = spriteSheetColumns;
const frameDurationMilliseconds = 90;

// Scaled well past the sheet's native 32x32 so the character is actually
// legible in the recorded video (playwright.config.ts's `video: 'on'`).
const characterDisplaySize = frameSizeInPixels * 6;

// A dark, desaturated clear color, chosen to sit far (in RGB distance) from
// every color in the adventurer sprite (skin, hair, blue jacket, maroon
// scarf) so `isCharacterPixel` below can reliably tell character pixels
// apart from background with a single cheap distance check.
const clearColor = new Color(0.08, 0.08, 0.12, 1);
const backgroundRgb = { r: 20, g: 20, b: 31 };
const backgroundDistanceThreshold = 60;

/** Matches any rendered pixel that isn't (close to) the scene's clear color. */
function isCharacterPixel(r: number, g: number, b: number): boolean {
  const distance =
    Math.abs(r - backgroundRgb.r) +
    Math.abs(g - backgroundRgb.g) +
    Math.abs(b - backgroundRgb.b);

  return distance > backgroundDistanceThreshold;
}

/**
 * Scans `canvas`'s actual displayed bitmap for pixels matching
 * `isCharacterPixel` and returns the mean x-coordinate ("center of mass") of
 * every match, or `null` if none are found. Deliberately not the midpoint of
 * the leftmost/rightmost match (`scanPixelBounds`'s `left`/`right`): the run
 * clip's swinging limbs change the sprite's silhouette *extent* frame to
 * frame independent of the character's actual translation, which makes that
 * midpoint noisy enough to occasionally miss a real, several-pixel shift.
 * Averaging over every matched pixel instead weights it by the character's
 * mostly-static torso/head mass, which tracks translation far more reliably
 * than its momentarily-extended fingertips/sword tip.
 */
function measureCentroidX(
  canvas: HTMLCanvasElement,
  isMatch: (r: number, g: number, b: number) => boolean,
): number | null {
  const sampleCanvas = document.createElement('canvas');

  sampleCanvas.width = canvas.width;
  sampleCanvas.height = canvas.height;

  const context2d = sampleCanvas.getContext('2d');

  if (!context2d) {
    throw new Error('2D canvas context not available');
  }

  context2d.drawImage(canvas, 0, 0);

  const { data } = context2d.getImageData(0, 0, canvas.width, canvas.height);

  let sumX = 0;
  let count = 0;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const offset = (y * canvas.width + x) * 4;

      if (isMatch(data[offset], data[offset + 1], data[offset + 2])) {
        sumX += x;
        count++;
      }
    }
  }

  return count === 0 ? null : sumX / count;
}

const pixelChangeTolerancePerChannel = 20;

/**
 * Counts pixels that differ by more than `pixelChangeTolerancePerChannel` in
 * at least one channel between two same-sized RGBA pixel buffers.
 */
function countChangedPixels(
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
): number {
  let changed = 0;

  for (let i = 0; i < before.length; i += 4) {
    const rDelta = Math.abs(before[i] - after[i]);
    const gDelta = Math.abs(before[i + 1] - after[i + 1]);
    const bDelta = Math.abs(before[i + 2] - after[i + 2]);

    if (
      rDelta > pixelChangeTolerancePerChannel ||
      gDelta > pixelChangeTolerancePerChannel ||
      bDelta > pixelChangeTolerancePerChannel
    ) {
      changed++;
    }
  }

  return changed;
}

// Wide enough to comfortably contain the character's full display size
// (192px) even with a several-pixel measurement margin.
const patchHalfWidthInPixels = characterDisplaySize / 2 + 20;

/**
 * Reads back a fixed-size, full-height vertical strip of `canvas`'s actual
 * displayed bitmap, horizontally centered on `centerX` (clamped so the strip
 * never runs off-canvas). Centering on the character's own current position
 * - rather than reading a fixed screen rectangle - is what lets
 * `countChangedPixelsSinceSnapshot` isolate genuine pose/frame changes (the
 * run clip's limbs moving) from the pixel churn that simple translation
 * alone would otherwise dominate the comparison with: a fixed-rectangle
 * read of a sprite that's just sliding sideways would itself show large,
 * unrelated pixel differences having nothing to do with which animation
 * frame is showing.
 */
function readCenteredPatch(
  canvas: HTMLCanvasElement,
  centerX: number,
): Uint8ClampedArray {
  const patchWidth = patchHalfWidthInPixels * 2;
  const left = Math.min(
    Math.max(Math.round(centerX - patchHalfWidthInPixels), 0),
    canvas.width - patchWidth,
  );

  const sampleCanvas = document.createElement('canvas');

  sampleCanvas.width = canvas.width;
  sampleCanvas.height = canvas.height;

  const context2d = sampleCanvas.getContext('2d');

  if (!context2d) {
    throw new Error('2D canvas context not available');
  }

  context2d.drawImage(canvas, 0, 0);

  return context2d.getImageData(left, 0, patchWidth, canvas.height).data;
}

/** The handle `character-animation.spec.ts` drives and asserts against. */
export interface CharacterAnimationSceneHandle extends SceneHandle {
  /** The character entity's local x position, driven by `moveAction`. */
  readonly playerLocalX: number;
  /** `FlipEcsComponent.flipX` on the character - mirrors when moving left. */
  readonly isFlippedX: boolean;
  /** Whether the run clip (rather than idle) is the active animation clip. */
  readonly isRunClipActive: boolean;
  /** The active clip's current `animationFrameIndex`. */
  readonly animationFrameIndex: number;

  /**
   * The character's on-screen center of mass (mean x of every non-background
   * pixel), or `null` if it isn't visible - see `measureCentroidX` for why
   * this is used over a bounding box's midpoint to track translation. Must
   * be called in the same `page.evaluate` task as the preceding `step()`.
   */
  measureCharacterCentroidX(): number | null;

  /**
   * Stores a snapshot of a fixed-size strip of the canvas, centered on the
   * character's current `measureCharacterCentroidX`, for a later
   * `countChangedPixelsSinceSnapshot` call. Throws if the character isn't
   * currently visible. Must be called in the same `page.evaluate` task as
   * the preceding `step()`.
   */
  captureCanvasSnapshot(): void;

  /**
   * Re-measures the character's centroid, reads the same-size strip
   * centered on its *current* position, and compares it against the last
   * `captureCanvasSnapshot` (or `countChangedPixelsSinceSnapshot`) call -
   * see `readCenteredPatch` for why re-centering on each read matters. Returns
   * how many pixels changed by more than a per-channel tolerance, and
   * re-snapshots for the next call. Must be called in the same
   * `page.evaluate` task as the preceding `step()`.
   */
  countChangedPixelsSinceSnapshot(): number;
}

/**
 * Builds a scene with a single keyboard-controlled character, driven by an
 * `Axis1dAction` bound to the arrow keys and A/D: holding left or right
 * moves the character and switches its `SpriteAnimationEcsComponent` from
 * the idle clip to the run clip (resetting `animationFrameIndex` to 0 per
 * sprite-animations.md's troubleshooting note, since the two clips have
 * different frame counts), and flips it horizontally via `FlipEcsComponent`
 * to face its direction of travel. Releasing every movement key returns it
 * to the idle clip.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<CharacterAnimationSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const moveAction = new Axis1dAction('move', 'game', actionResetTypes.noReset);

  const inputManager = registerInputs(world, time, {
    axis1dActions: [moveAction],
  });

  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(
      moveAction,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(moveAction, keyCodes.d, keyCodes.a),
  );

  createCamera(world, {
    isStatic: true,
    clearColor,
    // 1 world unit == 1 screen pixel, matching the other input/camera
    // scenes' convention.
    verticalWorldUnits: canvas.height,
  });

  const characterImage =
    await renderContext.imageCache.getOrLoad('/adventurer.png');

  const characterSprite = createImageSprite(characterImage, renderContext, 1, {
    frameDimensions: new Vector2(frameSizeInPixels, frameSizeInPixels),
    pixelated: true,
  });

  const spriteSheet = createSpriteSheet(
    characterImage,
    spriteSheetRows,
    spriteSheetColumns,
  );

  // `frameDimensions` above only sizes the sprite's on-screen quad;
  // `createImageSprite` always leaves `uvScale` at its (1, 1) default (the
  // whole texture), so it's set here from the sheet's own per-frame UV
  // size, or every frame would sample (and squash) the entire sheet instead
  // of a single 32x32 cell.
  characterSprite.uvScale = spriteSheet.frames[0][0].dimensions.clone();

  const idleClip = new AnimationClip(
    selectAnimationFrames(spriteSheet, idleFrameCount, 0),
  );
  const runClip = new AnimationClip(
    selectAnimationFrames(spriteSheet, runFrameCount, runRowStartFrameIndex),
  );

  const animationRegistry = new AssetRegistry<AnimationClip>();
  const idleAnimationHandle = animationRegistry.register('idle', idleClip);
  const runAnimationHandle = animationRegistry.register('run', runClip);

  const characterEntity = world.createEntity();

  const position = addPositionComponent(world, characterEntity, {
    local: new Vector2(0, 0),
    world: new Vector2(0, 0),
  });

  addSpriteComponent(world, characterEntity, {
    ...characterSprite,
    width: characterDisplaySize,
    height: characterDisplaySize,
  });

  const flip = addFlipComponent(world, characterEntity);

  const spriteAnimation = addSpriteAnimationComponent(world, characterEntity, {
    animationClipHandle: idleAnimationHandle,
    frameDurationMilliseconds,
  });

  // Anchored on the character entity (query: [positionId] also matches the
  // camera, which this system ignores) so it runs exactly once per tick -
  // the same single-system pattern `keyboard-input.ts` uses for its
  // input-consuming logic.
  const movementSystem: EcsSystem<[PositionEcsComponent]> = {
    query: [positionId],
    run: (result) => {
      if (result.entity !== characterEntity) {
        return;
      }

      const deltaSeconds = time.deltaTimeInMilliseconds / 1000;

      position.local.x +=
        moveAction.value * moveSpeedInWorldUnitsPerSecond * deltaSeconds;

      const isMoving = moveAction.value !== 0;
      const desiredClipHandle = isMoving
        ? runAnimationHandle
        : idleAnimationHandle;

      if (spriteAnimation.animationClipHandle !== desiredClipHandle) {
        spriteAnimation.animationClipHandle = desiredClipHandle;
        // The idle and run clips have different frame counts; carrying the
        // old animationFrameIndex across a clip switch can index past the
        // new clip's frame count (see sprite-animations.md's
        // troubleshooting note), so it's reset on every switch.
        spriteAnimation.animationFrameIndex = 0;
      }

      if (isMoving) {
        flip.flipX = moveAction.value < 0;
      }
    },
  };

  world.addSystem(movementSystem);
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createSpriteAnimationEcsSystem(time, animationRegistry));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;
  let lastPatchSnapshot: Uint8ClampedArray | null = null;

  function captureCenteredPatch(): Uint8ClampedArray {
    const centerX = measureCentroidX(canvas, isCharacterPixel);

    if (centerX === null) {
      throw new Error('Character is not currently visible on the canvas.');
    }

    return readCenteredPatch(canvas, centerX);
  }

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    get playerLocalX(): number {
      return position.local.x;
    },

    get isFlippedX(): boolean {
      return flip.flipX;
    },

    get isRunClipActive(): boolean {
      return spriteAnimation.animationClipHandle === runAnimationHandle;
    },

    get animationFrameIndex(): number {
      return spriteAnimation.animationFrameIndex;
    },

    measureCharacterCentroidX(): number | null {
      return measureCentroidX(canvas, isCharacterPixel);
    },

    captureCanvasSnapshot(): void {
      lastPatchSnapshot = captureCenteredPatch();
    },

    countChangedPixelsSinceSnapshot(): number {
      if (!lastPatchSnapshot) {
        throw new Error(
          'captureCanvasSnapshot must be called before countChangedPixelsSinceSnapshot.',
        );
      }

      const current = captureCenteredPatch();
      const changed = countChangedPixels(lastPatchSnapshot, current);

      lastPatchSnapshot = current;

      return changed;
    },
  };
};
