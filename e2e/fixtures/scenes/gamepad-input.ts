import { actionResetTypes, Axis1dAction, Color, createCamera, createCanvas, createImageSprite, createPresentEcsSystem, createRenderContext, createRenderEcsSystem, createTransformEcsSystem, EcsSystem, EcsWorld, gamepadAxes, GamepadAxis1dBinding, GamepadInputSource, PositionEcsComponent, positionId, registerInputs, SpriteEcsComponent, spriteId, Time } from '../../../src/index.js';
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
// How far, in world units, a square travels from its base position for a
// full +-1 stick deflection. Kept well within the canvas's +-400 world-unit
// half-width (canvas.height == verticalWorldUnits, canvas is 800 wide) even
// at full deflection from a centered base position, so a square never
// swings off-screen.
const stickRangeInWorldUnits = 250;

/** Converts a plain 0-255 RGB triple (see `input-scene-colors.ts`) to a `Color`. */
function toColor(rgb: { r: number; g: number; b: number }): Color {
  return new Color(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1);
}

/**
 * Installs a fake single-axis gamepad at index `0` and overrides
 * `navigator.getGamepads` to return it, since Playwright/CDP has no
 * built-in gamepad emulation and CI has no real controller attached. The
 * override must run *before* `GamepadInputSource` is constructed, since it
 * resolves its gamepad from `navigator.getGamepads()` synchronously in its
 * constructor (to pick up a gamepad that was already "connected" before the
 * source existed). The returned setter mutates the same `axes` array
 * `GamepadInputSource.update()` re-reads every frame via
 * `navigator.getGamepads()[index]`, modeling Chrome's real behavior of
 * updating the `Gamepad` object in place (see `GamepadInputSource`'s own
 * doc comment on why it re-fetches every frame instead of caching it).
 * @returns A setter for the fake gamepad's analog stick axes.
 */
function installFakeGamepad(): {
  setAxis(index: number, value: number): void;
} {
  const axes = [0, 0, 0, 0];

  const fakeGamepad = {
    id: 'forge-e2e-fake-gamepad',
    index: 0,
    connected: true,
    timestamp: 0,
    mapping: 'standard',
    axes,
    buttons: [],
  } as unknown as Gamepad;

  Object.defineProperty(navigator, 'getGamepads', {
    value: (): (Gamepad | null)[] => [fakeGamepad],
    configurable: true,
  });

  return {
    setAxis(index: number, value: number): void {
      axes[index] = value;
    },
  };
}

/** The handle `gamepad-input.spec.ts` drives and asserts against. */
export interface GamepadInputSceneHandle extends SceneHandle {
  /** The correctly-configured (`noReset`) stick square's local position. */
  readonly stickPosition: { x: number; y: number };
  /** The incorrectly-configured (default `zero` reset) stick square's local position. */
  readonly brokenStickPosition: { x: number; y: number };
  /** The `'menu'`-group stick square's local position. */
  readonly menuStickPosition: { x: number; y: number };
  /** Sets the fake gamepad's left stick X axis, in `[-1, 1]`. */
  setStickX(value: number): void;
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
 * Builds a scene exercising `GamepadInputSource` against a fake, polled
 * gamepad (see `installFakeGamepad`): a correctly-configured
 * `actionResetTypes.noReset` stick axis that moves continuously while
 * deflected (and ignores small deadzone drift), a second stick axis left at
 * the default `actionResetTypes.zero` to demonstrate the documented pitfall
 * (`gamepad.md`'s "Gotchas") of combining a polled source's
 * only-dispatch-on-change optimization with a reset type that zeroes the
 * action every frame - the value reads correctly for exactly one frame,
 * then gets stuck at `0` even though the stick stays deflected - and a
 * third stick binding on a `'menu'`-group action, to prove `InputManager`'s
 * active-group gating applies to a polled source the same way it does to
 * event-driven keyboard/mouse sources.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<GamepadInputSceneHandle> => {
  const fakeGamepad = installFakeGamepad();

  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const stickAction = new Axis1dAction(
    'stick',
    'game',
    actionResetTypes.noReset,
  );
  // Default `actionResetTypes.zero`, deliberately - see the scene doc
  // comment above for the "stuck at zero" pitfall this demonstrates.
  const brokenStickAction = new Axis1dAction('brokenStick', 'game');
  const menuStickAction = new Axis1dAction(
    'menuStick',
    'menu',
    actionResetTypes.noReset,
  );

  const inputManager = registerInputs(world, time, {
    axis1dActions: [stickAction, brokenStickAction, menuStickAction],
  });

  const gamepadInputSource = new GamepadInputSource(inputManager);

  gamepadInputSource.axis1dBindings.add(
    new GamepadAxis1dBinding(stickAction, {
      axisIndex: gamepadAxes.leftStickX,
    }),
  );
  gamepadInputSource.axis1dBindings.add(
    new GamepadAxis1dBinding(brokenStickAction, {
      axisIndex: gamepadAxes.leftStickX,
    }),
  );
  gamepadInputSource.axis1dBindings.add(
    new GamepadAxis1dBinding(menuStickAction, {
      axisIndex: gamepadAxes.leftStickX,
    }),
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
      local: { x, y },
      world: { x, y },
    });

    const sprite = world.addComponent(entity, spriteId, {
      ...squareSprite,
      width: squareSize,
      height: squareSize,
      tintColor: color,
    });

    return { position, sprite };
  }

  const stickBase = { x: 0, y: -200 };
  const brokenBase = { x: 0, y: 0 };
  const menuStickBase = { x: 0, y: 200 };

  const stick = createSquare(
    stickBase.x,
    stickBase.y,
    toColor(inputSceneColors.blue),
  );
  const broken = createSquare(
    brokenBase.x,
    brokenBase.y,
    toColor(inputSceneColors.yellow),
  );
  const menuStick = createSquare(
    menuStickBase.x,
    menuStickBase.y,
    toColor(inputSceneColors.cyan),
  );

  // `update` is a single batched call per tick regardless of how many
  // entities match `query`, so this system's body runs exactly once per
  // tick without needing to anchor itself on a particular entity.
  // Registered at the default `normal` priority, it runs after
  // `registerInputs`'s early input-update system - which polls
  // `GamepadInputSource.update()` - and before its late reset-inputs
  // system, the same ordering `createCameraEcsSystem` relies on for
  // pan/zoom input.
  //
  // Each square's offset from its base position is a direct mapping of its
  // action's *current* value (like a joystick-controlled reticle), not an
  // accumulation, so a square's position always reflects exactly what its
  // action currently holds - including staying frozen at its base position
  // once "stuck at zero" (see `brokenStickAction`), or at its last position
  // once group-gated (see `menuStickAction`), instead of drifting.
  const inputConsumerSystem: EcsSystem<[PositionEcsComponent]> = {
    query: [positionId],
    update: () => {
      stick.position.local.x =
        stickBase.x + stickAction.value * stickRangeInWorldUnits;
      broken.position.local.x =
        brokenBase.x + brokenStickAction.value * stickRangeInWorldUnits;
      menuStick.position.local.x =
        menuStickBase.x + menuStickAction.value * stickRangeInWorldUnits;
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

    get stickPosition(): { x: number; y: number } {
      return { x: stick.position.local.x, y: stick.position.local.y };
    },

    get brokenStickPosition(): { x: number; y: number } {
      return { x: broken.position.local.x, y: broken.position.local.y };
    },

    get menuStickPosition(): { x: number; y: number } {
      return { x: menuStick.position.local.x, y: menuStick.position.local.y };
    },

    setStickX(value: number): void {
      fakeGamepad.setAxis(gamepadAxes.leftStickX, value);
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
