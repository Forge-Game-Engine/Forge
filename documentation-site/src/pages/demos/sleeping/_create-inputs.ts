import { Time } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  buttonMoments,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  keyCodes,
  mouseButtons,
  MouseInputSource,
  MouseTriggerBinding,
  registerInputs,
  TriggerAction,
} from '@forge-game-engine/forge/input';

/** The mouse and the actions the demo's systems read. */
export interface SleepingInputs {
  mouse: MouseInputSource;

  /** Triggered when the left mouse button goes down. */
  explode: TriggerAction;

  /** Triggered when Space goes down. */
  openTrapdoor: TriggerAction;
}

/**
 * Binds a left click to an explosion and Space to opening the trapdoor.
 * @param world - The world to register the inputs in.
 * @param time - The game's time.
 * @param container - The element the mouse is read over.
 * @returns The mouse and the actions.
 */
export function createInputs(
  world: EcsWorld,
  time: Time,
  container: HTMLElement,
): SleepingInputs {
  const explode = new TriggerAction('explode');
  const openTrapdoor = new TriggerAction('openTrapdoor');

  const inputManager = registerInputs(world, time, {
    triggerActions: [explode, openTrapdoor],
  });
  const mouse = new MouseInputSource(inputManager, container);
  const keyboard = new KeyboardInputSource(inputManager);

  mouse.triggerBindings.add(
    new MouseTriggerBinding(explode, mouseButtons.left, buttonMoments.down),
  );
  keyboard.triggerBindings.add(
    new KeyboardTriggerBinding(
      openTrapdoor,
      keyCodes.space,
      buttonMoments.down,
    ),
  );

  return { mouse, explode, openTrapdoor };
}
