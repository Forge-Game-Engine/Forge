import { Time } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  Axis2dAction,
  HoldAction,
  KeyboardAxis2dBinding,
  KeyboardInputSource,
  keyCodes,
  mouseButtons,
  MouseHoldBinding,
  MouseInputSource,
  registerInputs,
} from '@forge-game-engine/forge/input';
import { Game } from '@forge-game-engine/forge/utilities';
import { TileEditorInputs } from './_tile-editor.system';

/**
 * Binds WASD and the arrow keys to walking, the left mouse button to
 * painting and the right one to erasing.
 * @param world - The world to register the inputs in.
 * @param time - The game's time.
 * @param game - The game, whose container the mouse is read over.
 * @returns The move action, and the mouse and actions the tile editor reads.
 */
export function createInputs(
  world: EcsWorld,
  time: Time,
  game: Game,
): { moveInput: Axis2dAction; editorInputs: TileEditorInputs } {
  const moveInput = new Axis2dAction('move');
  const paintInput = new HoldAction('paint');
  const eraseInput = new HoldAction('erase');

  const inputManager = registerInputs(world, time, {
    axis2dActions: [moveInput],
    holdActions: [paintInput, eraseInput],
  });

  const keyboard = new KeyboardInputSource(inputManager);
  const mouse = new MouseInputSource(inputManager, game.container);

  keyboard.axis2dBindings.add(
    new KeyboardAxis2dBinding(
      moveInput,
      keyCodes.w,
      keyCodes.s,
      keyCodes.d,
      keyCodes.a,
    ),
  );
  keyboard.axis2dBindings.add(
    new KeyboardAxis2dBinding(
      moveInput,
      keyCodes.arrowUp,
      keyCodes.arrowDown,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );
  mouse.holdBindings.add(new MouseHoldBinding(paintInput, mouseButtons.left));
  mouse.holdBindings.add(new MouseHoldBinding(eraseInput, mouseButtons.right));

  // The right button erases, so it doesn't open the browser's menu.
  game.container.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  return { moveInput, editorInputs: { mouse, paintInput, eraseInput } };
}
