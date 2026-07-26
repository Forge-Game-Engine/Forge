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
  MouseAxis1dBinding,
  MouseAxis2dBinding,
  mouseButtons,
  MouseHoldBinding,
  MouseInputSource,
  MouseTriggerBinding,
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
import { inputSceneColors } from './input-scene-colors.js';
import {
  matchesColor,
  PixelBounds,
  scanPixelBounds,
} from './input-scene-helpers.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;
const squareSize = 60;
// How far, in world units, the pointer square travels for a full ratio
// swing (mouse at a canvas edge, +-0.5 from `MouseAxis2dBinding`'s default
// center cursor origin).
const pointerRangeInWorldUnits = 300;
// How far, in world units, a single non-zero `scrollAction.value` frame
// moves the scroll square - see the scene doc comment for why this only
// ever applies for exactly one frame per wheel event.
const scrollStepInWorldUnits = 60;
const holdSmallSize = 40;
const holdBigSize = 90;

/** Converts a plain 0-255 RGB triple (see `input-scene-colors.ts`) to a `Color`. */
function toColor(rgb: { r: number; g: number; b: number }): Color {
  return new Color(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1);
}

/** The handle `mouse-input.spec.ts` drives and asserts against. */
export interface MouseInputSceneHandle extends SceneHandle {
  /** The cursor-tracking square's local position (`Axis2dAction`, `noReset`). */
  readonly pointerPosition: { x: number; y: number };
  /** The wheel-driven square's local position (`Axis1dAction`, default `zero` reset). */
  readonly scrollPosition: { x: number; y: number };
  /** How many times the `'game'`-group select `TriggerAction` has fired. */
  readonly gameTriggerCount: number;
  /** How many times the `'menu'`-group confirm `TriggerAction` has fired. */
  readonly menuTriggerCount: number;
  /** Whether the `HoldAction` bound to the right mouse button is currently held. */
  readonly isAiming: boolean;
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
 * Builds a scene exercising every mouse-bound action type against real
 * `MouseEvent`s: a cursor-tracking `Axis2dAction` (`actionResetTypes.noReset`,
 * so the square keeps following the last-known cursor ratio between
 * `mousemove` events instead of snapping back to center), a wheel-driven
 * `Axis1dAction` (the default `actionResetTypes.zero`, appropriate here
 * since a wheel event is a one-shot "delta this frame" input with no
 * corresponding "up" event to reverse it), a `TriggerAction` on the left
 * button, a `HoldAction` on the right button, and a second `TriggerAction`
 * bound to the *same* left button but a different (`'menu'`) input group -
 * a regression test for `MouseInputSource` previously triggering regardless
 * of the active input group.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<MouseInputSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const pointerAction = new Axis2dAction(
    'pointer',
    'game',
    actionResetTypes.noReset,
  );
  // Default `actionResetTypes.zero`, correctly here: the wheel has no "up"
  // event to reverse a `noReset` value, so without a zero reset a single
  // scroll tick would move the square every single frame forever.
  const scrollAction = new Axis1dAction('scroll', 'game');
  const selectAction = new TriggerAction('select', 'game');
  const menuConfirmAction = new TriggerAction('confirm', 'menu');
  const aimAction = new HoldAction('aim', 'game');

  const inputManager = registerInputs(world, time, {
    axis2dActions: [pointerAction],
    axis1dActions: [scrollAction],
    triggerActions: [selectAction, menuConfirmAction],
    holdActions: [aimAction],
  });

  const mouseInputSource = new MouseInputSource(inputManager, canvas);

  mouseInputSource.axis2dBindings.add(new MouseAxis2dBinding(pointerAction));
  mouseInputSource.axis1dBindings.add(new MouseAxis1dBinding(scrollAction));

  mouseInputSource.triggerBindings.add(
    new MouseTriggerBinding(
      selectAction,
      mouseButtons.left,
      buttonMoments.down,
    ),
  );

  // Same physical button as `selectAction` above, deliberately - this is
  // what proves group gating actually discards the dispatch rather than
  // the two actions simply never colliding in practice.
  mouseInputSource.triggerBindings.add(
    new MouseTriggerBinding(
      menuConfirmAction,
      mouseButtons.left,
      buttonMoments.down,
    ),
  );

  mouseInputSource.holdBindings.add(
    new MouseHoldBinding(aimAction, mouseButtons.right),
  );

  const cameraEntity = createCamera(world, {
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

  const pointerBase = { x: 0, y: -200 };
  const pointer = createSquare(
    pointerBase.x,
    pointerBase.y,
    toColor(inputSceneColors.blue),
  );
  const scroll = createSquare(-300, 0, toColor(inputSceneColors.yellow));
  const marker = createSquare(-300, 200, toColor(inputSceneColors.red));
  const holdSquare = createSquare(300, 0, toColor(inputSceneColors.orange));

  holdSquare.sprite.width = holdSmallSize;
  holdSquare.sprite.height = holdSmallSize;

  let gameTriggerCount = 0;
  let menuTriggerCount = 0;

  // A single system, anchored on the camera entity (query: [positionId]
  // matches it too) so it runs exactly once per tick regardless of how many
  // squares exist. Registered at the default `normal` priority, it runs
  // after `registerInputs`'s early input-update system (so this frame's
  // mouse events have already been dispatched) and before its late
  // reset-inputs system (so `isTriggered`/axis values are still valid) -
  // the same ordering `createCameraEcsSystem` relies on for pan/zoom input.
  const inputConsumerSystem: EcsSystem<[PositionEcsComponent]> = {
    query: [positionId],
    run: (result) => {
      if (result.entity !== cameraEntity) {
        return;
      }

      // A direct position mapping (not an accumulation) - `pointerAction`
      // represents the cursor's *current* ratio offset from center, so the
      // square should track it continuously, the same way a real cursor or
      // reticle would.
      pointer.position.local.x =
        pointerBase.x + pointerAction.value.x * pointerRangeInWorldUnits;
      pointer.position.local.y =
        pointerBase.y + pointerAction.value.y * pointerRangeInWorldUnits;

      scroll.position.local.x += scrollAction.value * scrollStepInWorldUnits;

      if (selectAction.isTriggered) {
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

      const holdSize = aimAction.isHeld ? holdBigSize : holdSmallSize;

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

    get pointerPosition(): { x: number; y: number } {
      return { x: pointer.position.local.x, y: pointer.position.local.y };
    },

    get scrollPosition(): { x: number; y: number } {
      return { x: scroll.position.local.x, y: scroll.position.local.y };
    },

    get gameTriggerCount(): number {
      return gameTriggerCount;
    },

    get menuTriggerCount(): number {
      return menuTriggerCount;
    },

    get isAiming(): boolean {
      return aimAction.isHeld;
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
