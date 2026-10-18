import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { AtlasRegion } from '@forge-game-engine/forge/rendering';

/**
 * The atlas regions a ship's sprite cycles through, and how long it shows
 * each one.
 */
export interface ShipStyleEcsComponent {
  styles: readonly AtlasRegion[];
  secondsPerStyle: number;
  /** Shifts this ship's cycle so the ships don't all change at once. */
  phaseSeconds: number;
}

export const shipStyleId = createComponentId<ShipStyleEcsComponent>(
  'texture-atlas-demo-ship-style',
);

/**
 * Makes a ship cycle through `styles`, two seconds each.
 * @param world - The world the ship belongs to.
 * @param entity - The ship.
 * @param styles - The regions to cycle through.
 * @param phaseSeconds - How far into its cycle the ship starts.
 * @returns The attached component.
 */
export function addShipStyleComponent(
  world: EcsWorld,
  entity: number,
  styles: readonly AtlasRegion[],
  phaseSeconds: number,
): ShipStyleEcsComponent {
  return world.addComponent(entity, shipStyleId, {
    styles,
    secondsPerStyle: 2,
    phaseSeconds,
  });
}
