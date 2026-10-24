import { Time } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  buttonMoments,
  HoldAction,
  mouseButtons,
  MouseHoldBinding,
  MouseInputSource,
  MouseTriggerBinding,
  registerInputs,
  TriggerAction,
} from '@forge-game-engine/forge/input';
import { PointerInputs } from './_pointer.system';

/**
 * Binds the left mouse button to two actions: pressing it (to pick a wall
 * or set the units' target) and holding it (to keep dragging a wall).
 * @param world - The world to register the inputs in.
 * @param time - The game's time.
 * @param container - The element the mouse is read over.
 * @returns The mouse and the actions the pointer system reads.
 */
export function createInputs(
  world: EcsWorld,
  time: Time,
  container: HTMLElement,
): PointerInputs {
  const pressInput = new TriggerAction('press');
  const holdInput = new HoldAction('hold');

  const inputManager = registerInputs(world, time, {
    triggerActions: [pressInput],
    holdActions: [holdInput],
  });
  const mouse = new MouseInputSource(inputManager, container);

  mouse.triggerBindings.add(
    new MouseTriggerBinding(pressInput, mouseButtons.left, buttonMoments.down),
  );
  mouse.holdBindings.add(new MouseHoldBinding(holdInput, mouseButtons.left));

  return { mouse, pressInput, holdInput };
}
