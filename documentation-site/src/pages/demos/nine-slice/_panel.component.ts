import { createComponentId } from '@forge-game-engine/forge/ecs';

/**
 * Per-entity data driving one panel in the nine-slice demo: the square size
 * (in world units) its sprite breathes between, so the same system can
 * animate all three comparison panels together.
 */
export interface PanelEcsComponent {
  minSize: number;
  maxSize: number;
}

export const panelId = createComponentId<PanelEcsComponent>('panel');
