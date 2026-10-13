import type { Exhaust } from './_create-exhaust';

/** The world orders of the scene's sprites, which the exhaust sorts among. */
export const spriteOrders = {
  background: -2,
  ship: 0,
  asteroid: 1,
};

/** What the demo's settings change about the exhaust. */
export interface ExhaustSettings {
  /** The exhaust's `DrawOrderEcsComponent.order`. */
  order: number;

  /** The exhaust's `MeshEcsComponent.layer`; every sprite is in layer `0`. */
  layer: number;
}

/** Between the background and the ship, like a real exhaust. */
export const defaultExhaustSettings: ExhaustSettings = {
  order: -1,
  layer: 0,
};

/**
 * Writes the settings into the running exhaust. The render system sorts it
 * again on the next frame: first by layer, then by world order.
 * @param exhaust - The exhaust to change.
 * @param settings - The settings to apply.
 */
export function applyExhaustSettings(
  exhaust: Exhaust,
  settings: ExhaustSettings,
): void {
  exhaust.drawOrder.order = settings.order;
  exhaust.mesh.layer = settings.layer;
}
