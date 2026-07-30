import {
  actionResetTypes,
  Axis1dAction,
  Axis2dAction,
  buttonMoments,
  Color,
  createCamera,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createTransformEcsSystem,
  EcsSystem,
  EcsWorld,
  HoldAction,
  KeyboardAxis1dBinding,
  KeyboardAxis2dBinding,
  KeyboardHoldBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  keyCodes,
  PositionEcsComponent,
  positionId,
  registerInputs,
  SpriteEcsComponent,
  spriteId,
  Time,
  TriggerAction,
  Vector2,
} from '../../../src/index.js';
import { createWhiteSquareImage } from './create-white-square-image.js';
import {
  matchesColor,
  PixelBounds,
  scanPixelBounds,
} from './input-scene-helpers.js';
import { inputSceneColors } from './input-scene-colors.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;
const squareSize = 60;
const moveSpeedInWorldUnitsPerSecond = 200;
// How far, in world units, a single non-zero `impulseAction.value` frame
// moves the impulse square - see the scene doc comment for why this only
// ever applies for exactly one frame per key press/release.
const impulseStepInWorldUnits = 80;
const holdSmallSize = 40;
const holdBigSize = 90;

/** Converts a plain 0-255 RGB triple (see `input-scene-colors.ts`) to a `Color`. */
function toColor(rgb: { r: number; g: number; b: number }): Color {
  return new Color(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1);
}

/** The handle `keyboard-input.spec.ts` drives and asserts against. */
export interface KeyboardInputSceneHandle extends SceneHandle {
  /** The WASD-driven square's local position (`Axis2dAction`, `noReset`). */
  readonly moverPosition: { x: number; y: number };
  /** The arrow-key-driven square's local position (`Axis1dAction`, default `zero` reset). */
  readonly impulsePosition: { x: number; y: number };
  /** How many times the `'game'`-group jump `TriggerAction` has fired. */
  readonly gameTriggerCount: number;
  /** How many times the `'menu'`-group confirm `TriggerAction` has fired. */
  readonly menuTriggerCount: number;
  /** Whether the `HoldAction` bound to `KeyC` is currently held. */
  readonly isCrouching: boolean;
  /** Sets the `InputManager`'s active input group. */
  setActiveGroup(group: string | null): void;
  /**
   * Scans the rendered canvas for pixels matching `targetRgb` (see
   * `input-scene-colors.ts`) and returns their bounding box, or `null` if
   * none are found. Must be called in the same `page.evaluate` task as the
   * preceding `step()` - see `SceneHandle.step`.
   */
  measureBounds(targetRgb: {
    r: number;
    g: number;
    b: number;
  }): PixelBounds | null;
}

/**
 * Builds a scene exercising every keyboard-bound action type against real
 * `KeyboardEvent`s: a WASD-driven `Axis2dAction` (continuous movement, via
 * `actionResetTypes.noReset`), an arrow-key-driven `Axis1dAction` (the
 * default `actionResetTypes.zero`, deliberately - see the impulse square's
 * comment below), a `TriggerAction` on Space, a `HoldAction` on `KeyC`, and
 * a second `TriggerAction` bound to the *same* Space key but a different
 * (`'menu'`) input group, to prove `InputManager`'s active-group gating
 * actually gates dispatch rather than just binding lookup.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<KeyboardInputSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const moveAction = new Axis2dAction('move', 'game', actionResetTypes.noReset);
  // Default `actionResetTypes.zero`, on purpose: this is the scene's
  // demonstration of the "twitchy" behavior actions.md warns about for a
  // held key bound with the default reset type - see the spec for the
  // exact single-impulse-then-snap-back sequence this produces.
  const impulseAction = new Axis1dAction('impulse', 'game');
  const jumpAction = new TriggerAction('jump', 'game');
  const menuConfirmAction = new TriggerAction('confirm', 'menu');
  const crouchAction = new HoldAction('crouch', 'game');

  const inputManager = registerInputs(world, time, {
    axis2dActions: [moveAction],
    axis1dActions: [impulseAction],
    triggerActions: [jumpAction, menuConfirmAction],
    holdActions: [crouchAction],
  });

  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.axis2dBindings.add(
    new KeyboardAxis2dBinding(
      moveAction,
      keyCodes.w,
      keyCodes.s,
      keyCodes.d,
      keyCodes.a,
    ),
  );

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(
      impulseAction,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );

  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(jumpAction, keyCodes.space, buttonMoments.down),
  );

  // Same physical key as `jumpAction` above, deliberately - this is what
  // proves group gating actually discards the dispatch rather than the two
  // actions simply never colliding in practice.
  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(
      menuConfirmAction,
      keyCodes.space,
      buttonMoments.down,
    ),
  );

  keyboardInputSource.holdBindings.add(
    new KeyboardHoldBinding(crouchAction, keyCodes.c),
  );

  createCamera(world, {
    isStatic: true,
    clearColor: toColor(inputSceneColors.clear),
    // 1 world unit == 1 screen pixel, see camera-pan-zoom.ts's identical use.
    verticalWorldUnits: canvas.height,
  });

  const squareImage = await createWhiteSquareImage();
  const squareSprite = createImageSprite(squareImage, renderContext, 1);

  function createSquare(
    x: number,
    y: number,
    color: Color,
  ): { position: PositionEcsComponent; sprite: SpriteEcsComponent } {
    const entity = world.createEntity();

    const position = world.addComponent(entity, positionId, {
      local: new Vector2(x, y),
      world: new Vector2(x, y),
    });

    const sprite = world.addComponent(entity, spriteId, {
      ...squareSprite,
      width: squareSize,
      height: squareSize,
      tintColor: color,
    });

    return { position, sprite };
  }

  const mover = createSquare(-300, -200, toColor(inputSceneColors.blue));
  const impulse = createSquare(-300, 0, toColor(inputSceneColors.yellow));
  const marker = createSquare(-300, 200, toColor(inputSceneColors.red));
  const holdSquare = createSquare(300, 0, toColor(inputSceneColors.orange));

  holdSquare.sprite.width = holdSmallSize;
  holdSquare.sprite.height = holdSmallSize;

  let gameTriggerCount = 0;
  let menuTriggerCount = 0;

  // `update` is a single batched call per tick regardless of how many
  // entities match `query`, so this system's body runs exactly once per
  // tick without needing to anchor itself on a particular entity.
  // Registered at the default `normal` priority, it runs after
  // `registerInputs`'s early input-update system (so this frame's
  // key events have already been dispatched) and before its late
  // reset-inputs system (so `isTriggered`/axis values are still valid) -
  // the same ordering `createCameraEcsSystem` relies on for pan/zoom input.
  const inputConsumerSystem: EcsSystem<[PositionEcsComponent]> = {
    query: [positionId],
    update: () => {
      const deltaSeconds = time.deltaTimeInMilliseconds / 1000;

      mover.position.local.x +=
        moveAction.value.x * moveSpeedInWorldUnitsPerSecond * deltaSeconds;
      mover.position.local.y +=
        moveAction.value.y * moveSpeedInWorldUnitsPerSecond * deltaSeconds;

      impulse.position.local.x += impulseAction.value * impulseStepInWorldUnits;

      if (jumpAction.isTriggered) {
        gameTriggerCount++;
        marker.sprite.tintColor =
          gameTriggerCount % 2 === 0
            ? toColor(inputSceneColors.red)
            : toColor(inputSceneColors.green);
      }

      if (menuConfirmAction.isTriggered) {
        menuTriggerCount++;
        marker.sprite.tintColor = toColor(inputSceneColors.magenta);
      }

      const holdSize = crouchAction.isHeld ? holdBigSize : holdSmallSize;

      holdSquare.sprite.width = holdSize;
      holdSquare.sprite.height = holdSize;
    },
  };

  world.addSystem(inputConsumerSystem);
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    get moverPosition(): { x: number; y: number } {
      return { x: mover.position.local.x, y: mover.position.local.y };
    },

    get impulsePosition(): { x: number; y: number } {
      return { x: impulse.position.local.x, y: impulse.position.local.y };
    },

    get gameTriggerCount(): number {
      return gameTriggerCount;
    },

    get menuTriggerCount(): number {
      return menuTriggerCount;
    },

    get isCrouching(): boolean {
      return crouchAction.isHeld;
    },

    setActiveGroup(group: string | null): void {
      inputManager.setActiveGroup(group);
    },

    measureBounds(targetRgb: {
      r: number;
      g: number;
      b: number;
    }): PixelBounds | null {
      return scanPixelBounds(canvas, matchesColor(targetRgb));
    },
  };
};
