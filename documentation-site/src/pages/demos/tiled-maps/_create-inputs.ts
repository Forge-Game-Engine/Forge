import { Time } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  Axis1dAction,
  buttonMoments,
  KeyboardAxis1dBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  keyCodes,
  mouseButtons,
  MouseInputSource,
  MouseTriggerBinding,
  registerInputs,
  TriggerAction,
} from '@forge-game-engine/forge/input';
import { PlayerMoveInputs } from './_player-move.system';
import { TileToggleInputs } from './_tile-toggle.system';

/**
 * Binds A/D and the left and right arrows to walking, Space, W and the up
 * arrow to jumping, and the left mouse button to toggling a tile.
 * @param world - The world to register the inputs in.
 * @param time - The game's time.
 * @param container - The element the mouse is read over.
 * @returns The player's and the tile toggle's inputs.
 */
export function createInputs(
  world: EcsWorld,
  time: Time,
  container: HTMLElement,
): { moveInputs: PlayerMoveInputs; toggleInputs: TileToggleInputs } {
  const walkInput = new Axis1dAction('walk');
  const jumpInput = new TriggerAction('jump');
  const toggleInput = new TriggerAction('toggle-tile');

  const inputManager = registerInputs(world, time, {
    axis1dActions: [walkInput],
    triggerActions: [jumpInput, toggleInput],
  });
  const keyboard = new KeyboardInputSource(inputManager);
  const mouse = new MouseInputSource(inputManager, container);

  keyboard.axis1dBindings.add(
    new KeyboardAxis1dBinding(walkInput, keyCodes.d, keyCodes.a),
  );
  keyboard.axis1dBindings.add(
    new KeyboardAxis1dBinding(
      walkInput,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );

  for (const key of [keyCodes.space, keyCodes.w, keyCodes.arrowUp]) {
    keyboard.triggerBindings.add(
      new KeyboardTriggerBinding(jumpInput, key, buttonMoments.down),
    );
  }

  mouse.triggerBindings.add(
    new MouseTriggerBinding(toggleInput, mouseButtons.left, buttonMoments.down),
  );

  return {
    moveInputs: { walkInput, jumpInput },
    toggleInputs: { mouse, toggleInput },
  };
}
