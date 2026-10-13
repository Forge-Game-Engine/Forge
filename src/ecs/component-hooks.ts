import type { EcsWorld } from './ecs-world.js';

/**
 * A remove hook as the world calls it, with the component's type erased:
 * the world stores every component as `unknown`.
 */
export type UntypedComponentRemoveHook = (
  world: EcsWorld,
  entity: number,
  component: unknown,
) => void;

// The remove hook of every component key that has one. Written only by
// `createComponentId`, once, when the key is made, so it's part of the
// key's definition like the symbol itself, not state anything changes
// later. A plain `Map`: keys are module constants made once, so holding
// them costs nothing. Kept in a module the package doesn't export, so only
// `createComponentId` can give a key a hook.
const removeHooks = new Map<symbol, UntypedComponentRemoveHook>();

/**
 * Records a component key's remove hook. Called by `createComponentId`.
 * @param key - The new component key.
 * @param hook - The key's remove hook.
 */
export function setComponentRemoveHook(
  key: symbol,
  hook: UntypedComponentRemoveHook,
): void {
  removeHooks.set(key, hook);
}

/**
 * Reads a component key's remove hook.
 * @param key - The component key.
 * @returns The hook, or `undefined` if the key was made without one.
 */
export function getComponentRemoveHook(
  key: symbol,
): UntypedComponentRemoveHook | undefined {
  return removeHooks.get(key);
}
