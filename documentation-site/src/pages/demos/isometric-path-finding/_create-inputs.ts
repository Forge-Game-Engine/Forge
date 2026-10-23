import { Time } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  Axis2dAction,
  buttonMoments,
  KeyboardAxis2dBinding,
  KeyboardInputSource,
  keyCodes,
  mouseButtons,
  MouseInputSource,
  MouseTriggerBinding,
  registerInputs,
  TriggerAction,
} from '@forge-game-engine/forge/input';
import { CellCursorInputs } from './_cell-cursor.system';

/**
 * Binds WASD and the arrow keys to walking along the screen's axes, and the
 * left mouse button to toggling a wall.
 * @param world - The world to register the inputs in.
 * @param time - The game's time.
 * @param container - The element the mouse is read over.
 * @returns The walk action, and the mouse and action the cell cursor reads.
 */
export function createInputs(
  world: EcsWorld,
  time: Time,
  container: HTMLElement,
): { moveInput: Axis2dAction; cursorInputs: CellCursorInputs } {
  const moveInput = new Axis2dAction('move');
  const toggleInput = new TriggerAction('toggle-wall');

  const inputManager = registerInputs(world, time, {
    axis2dActions: [moveInput],
    triggerActions: [toggleInput],
  });
  const keyboard = new KeyboardInputSource(inputManager);
  const mouse = new MouseInputSource(inputManager, container);

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
  mouse.triggerBindings.add(
    new MouseTriggerBinding(toggleInput, mouseButtons.left, buttonMoments.down),
  );

  return { moveInput, cursorInputs: { mouse, toggleInput } };
}
