import {
  actionResetTypes,
  Axis1dAction,
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
  gamepadAxes,
  GamepadAxis1dBinding,
  gamepadButtons,
  GamepadHoldBinding,
  GamepadInputSource,
  GamepadTriggerBinding,
  HoldAction,
  PositionEcsComponent,
  positionId,
  registerInputs,
  SpriteEcsComponent,
  spriteId,
  Time,
  TriggerAction,
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
// How far, in world units, a square travels from its base position for a
// full +-1 stick deflection. Kept well within the canvas's +-400 world-unit
// half-width (canvas.height == verticalWorldUnits, canvas is 800 wide) even
// at full deflection from a centered base position, so a square never
// swings off-screen.
const stickRangeInWorldUnits = 250;
// How far, in world units, the vertical square travels from its base
// position for a full +-1 value, kept within the canvas's +-300 world-unit
// half-height.
const verticalRangeInWorldUnits = 200;
// How far, in world units, the trigger square steps right per trigger.
const triggerStepInWorldUnits = 60;
const holdSmallSize = 30;
const holdBigSize = 80;
// Enough buttons to cover every index in the W3C Standard Gamepad layout.
const standardGamepadButtonCount = 17;

/** Converts a plain 0-255 RGB triple (see `input-scene-colors.ts`) to a `Color`. */
function toColor(rgb: { r: number; g: number; b: number }): Color {
  return new Color(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1);
}

/**
 * Installs a fake standard-layout gamepad at index `0` and overrides
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
 * Buttons are mutated in place the same way.
 * @returns Setters for the fake gamepad's analog stick axes and buttons,
 * and a way to unplug it.
 */
function installFakeGamepad(): {
  setAxis(index: number, value: number): void;
  setButton(index: number, pressed: boolean): void;
  disconnect(): void;
} {
  const axes = [0, 0, 0, 0];
  const buttons = Array.from({ length: standardGamepadButtonCount }, () => ({
    pressed: false,
    touched: false,
    value: 0,
  }));
  let connected = true;

  const fakeGamepad = {
    id: 'forge-e2e-fake-gamepad',
    index: 0,
    connected: true,
    timestamp: 0,
    mapping: 'standard',
    axes,
    buttons,
  } as unknown as Gamepad;

  Object.defineProperty(navigator, 'getGamepads', {
    value: (): (Gamepad | null)[] => (connected ? [fakeGamepad] : []),
    configurable: true,
  });

  return {
    setAxis(index: number, value: number): void {
      axes[index] = value;
    },
    setButton(index: number, pressed: boolean): void {
      buttons[index] = { pressed, touched: pressed, value: pressed ? 1 : 0 };
    },
    disconnect(): void {
      // Matches the Gamepad API's ordering: the gamepad is removed from
      // `navigator.getGamepads()` before `gamepaddisconnected` fires.
      connected = false;
      window.dispatchEvent(
        Object.assign(new Event('gamepaddisconnected'), {
          gamepad: fakeGamepad,
        }),
      );
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
  /** The up-is-positive vertical square's local position. */
  readonly verticalPosition: { x: number; y: number };
  /** Whether the `shoot` hold action is currently held. */
  readonly isShooting: boolean;
  /** How many times the consumer system has seen `restart` triggered. */
  readonly restartCount: number;
  /** Sets the fake gamepad's left stick X axis, in `[-1, 1]`. */
  setStickX(value: number): void;
  /** Sets the fake gamepad's left stick Y axis, in `[-1, 1]` (W3C: up is `-1`). */
  setStickY(value: number): void;
  /**
   * Presses or releases a button on the fake gamepad, by its
   * `gamepadButtons` name (resolved here, since specs can't value-import
   * `/src`).
   */
  setButton(button: keyof typeof gamepadButtons, pressed: boolean): void;
  /** Unplugs the fake gamepad. */
  disconnect(): void;
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
 * event-driven keyboard/mouse sources. It also exercises button-driven
 * hold and trigger bindings, an inverted stick axis sharing an
 * up-is-positive action with the D-pad, and releasing everything the
 * gamepad was driving once it's unplugged.
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

  // Up is positive, the same convention as
  // `KeyboardAxis1dBinding(action, keyCodes.w, keyCodes.s)`.
  const verticalAction = new Axis1dAction(
    'vertical',
    'game',
    actionResetTypes.noReset,
  );
  const shootAction = new HoldAction('shoot', 'game');
  const restartAction = new TriggerAction('restart', 'game');

  const inputManager = registerInputs(world, time, {
    axis1dActions: [
      stickAction,
      brokenStickAction,
      menuStickAction,
      verticalAction,
    ],
    holdActions: [shootAction],
    triggerActions: [restartAction],
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
  gamepadInputSource.axis1dBindings.add(
    new GamepadAxis1dBinding(verticalAction, {
      axisIndex: gamepadAxes.leftStickY,
      inverted: true,
    }),
  );
  gamepadInputSource.axis1dBindings.add(
    new GamepadAxis1dBinding(verticalAction, {
      positiveButtonIndex: gamepadButtons.dpadUp,
      negativeButtonIndex: gamepadButtons.dpadDown,
    }),
  );
  gamepadInputSource.holdBindings.add(
    new GamepadHoldBinding(shootAction, gamepadButtons.faceButtonBottom),
  );
  gamepadInputSource.triggerBindings.add(
    new GamepadTriggerBinding(
      restartAction,
      gamepadButtons.start,
      buttonMoments.down,
    ),
  );

  createCamera(world, {
    isStatic: true,
    clearColor: toColor(inputSceneColors.clear),
    // 1 world unit == 1 screen pixel, see camera-pan-zoom.ts's identical use.
    verticalWorldUnits: canvas.height,
  });

  const squareImage = await createWhiteSquareImage();
  const squareSprite = createImageSprite(squareImage, renderContext, {
    pixelsPerUnit: 1,
  });

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

  // Placed clear of the three stick rows above, and of each other, so no
  // landmark ever occludes another.
  const verticalBase = { x: 340, y: 0 };
  const vertical = createSquare(
    verticalBase.x,
    verticalBase.y,
    toColor(inputSceneColors.green),
  );
  const holdSquare = createSquare(-300, 100, toColor(inputSceneColors.orange));
  const triggerSquare = createSquare(
    -300,
    -100,
    toColor(inputSceneColors.magenta),
  );

  holdSquare.sprite.width = holdSmallSize;
  holdSquare.sprite.height = holdSmallSize;

  let restartCount = 0;

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
      vertical.position.local.y =
        verticalBase.y + verticalAction.value * verticalRangeInWorldUnits;

      const holdSize = shootAction.isHeld ? holdBigSize : holdSmallSize;

      holdSquare.sprite.width = holdSize;
      holdSquare.sprite.height = holdSize;

      // `isTriggered` is only read here, between `registerInputs`'s
      // input-update and reset-inputs systems, so this counts each press
      // exactly once if the trigger survives until this system runs and is
      // cleared before the next frame.
      if (restartAction.isTriggered) {
        restartCount++;
        triggerSquare.position.local.x += triggerStepInWorldUnits;
      }
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

    get verticalPosition(): { x: number; y: number } {
      return { x: vertical.position.local.x, y: vertical.position.local.y };
    },

    get isShooting(): boolean {
      return shootAction.isHeld;
    },

    get restartCount(): number {
      return restartCount;
    },

    setStickX(value: number): void {
      fakeGamepad.setAxis(gamepadAxes.leftStickX, value);
    },

    setStickY(value: number): void {
      fakeGamepad.setAxis(gamepadAxes.leftStickY, value);
    },

    setButton(button: keyof typeof gamepadButtons, pressed: boolean): void {
      fakeGamepad.setButton(gamepadButtons[button], pressed);
    },

    disconnect(): void {
      fakeGamepad.disconnect();
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
