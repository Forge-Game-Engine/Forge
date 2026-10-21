import { VisibilityEcsComponent } from '@forge-game-engine/forge/rendering';
import {
  EditableLayer,
  TileBrush,
  TileEditorEcsComponent,
} from './_tile-editor.component';

/** One of the demo's maps, and what the tile editor needs to edit it. */
export interface DemoMap {
  /** The visibility of the map's root, which hides every layer under it. */
  visibility: VisibilityEcsComponent;

  /** The map's layers, bottom to top. */
  layers: readonly EditableLayer[];

  /** The entity outlining the cell under the mouse, a child of the top layer. */
  cursor: number;

  /** The tiles the map can be painted with. */
  brushes: readonly TileBrush[];
}

/**
 * Shows one map, hides the others, and points the tile editor at the shown
 * map's layers, cursor and first brush.
 * @param editor - The tile editor.
 * @param maps - Every map.
 * @param shown - The map to show.
 */
export function showMap(
  editor: TileEditorEcsComponent,
  maps: readonly DemoMap[],
  shown: DemoMap,
): void {
  for (const map of maps) {
    map.visibility.visible = map === shown;
  }

  editor.layers = shown.layers;
  editor.cursor = shown.cursor;
  editor.brush = shown.brushes[0];
}
