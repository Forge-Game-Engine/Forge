import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';

/** What the page's panel turns on and off. */
export interface PathFindingViewSettings {
  /** Whether the grid's blocked cells are drawn. */
  showBlockedCells: boolean;

  /** Whether each unit's path is drawn as the grid search found it. */
  showRawPaths: boolean;

  /** Whether each unit's smoothed path, the one it walks, is drawn. */
  showSmoothedPaths: boolean;
}

/**
 * What the demo draws over the level. The page's panel writes the settings;
 * the grid overlay system writes the rest.
 */
export interface PathFindingViewEcsComponent extends PathFindingViewSettings {
  /** One hidden sprite entity per grid cell, by node id. */
  cellOverlays: number[];

  /** The grid `version` the overlay last showed, `-1` before the first. */
  drawnGridVersion: number;

  /** The `showBlockedCells` the overlay last showed. */
  drawnShowBlockedCells: boolean;
}

export const pathFindingViewId =
  createComponentId<PathFindingViewEcsComponent>('path-finding-view');

export const defaultPathFindingViewSettings: PathFindingViewSettings = {
  showBlockedCells: true,
  showRawPaths: false,
  showSmoothedPaths: true,
};

/**
 * Attaches a {@link PathFindingViewEcsComponent} to `entity`, with the
 * default settings.
 * @param world - The world the entity belongs to.
 * @param entity - The entity to attach the component to.
 * @param cellOverlays - The overlay's sprite entity for each grid cell.
 * @returns The attached component.
 */
export function addPathFindingViewComponent(
  world: EcsWorld,
  entity: number,
  cellOverlays: number[],
): PathFindingViewEcsComponent {
  return world.addComponent(entity, pathFindingViewId, {
    ...defaultPathFindingViewSettings,
    cellOverlays,
    drawnGridVersion: -1,
    drawnShowBlockedCells: false,
  });
}

/**
 * Writes the panel's settings into the view. The drawing systems read them
 * every frame, so a change shows on the next one.
 * @param view - The demo's view.
 * @param settings - The settings to apply.
 */
export function applyPathFindingViewSettings(
  view: PathFindingViewEcsComponent,
  settings: PathFindingViewSettings,
): void {
  view.showBlockedCells = settings.showBlockedCells;
  view.showRawPaths = settings.showRawPaths;
  view.showSmoothedPaths = settings.showSmoothedPaths;
}
