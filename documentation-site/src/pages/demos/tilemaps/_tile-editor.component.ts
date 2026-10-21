import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { ParameterizedForgeEvent } from '@forge-game-engine/forge/events';
import { TilePropertyValue } from '@forge-game-engine/forge/tilemaps';

/** One layer of a map the editor works on. */
export interface EditableLayer {
  /** The layer's name in the readout. */
  name: string;

  /** The entity with the layer's `TilemapLayerEcsComponent`. */
  entity: number;
}

/** A tile the left mouse button paints, and the layer it paints it into. */
export interface TileBrush {
  /** The brush's name on the page. */
  name: string;

  /** The entity of the layer the brush paints into. */
  layer: number;

  /** The packed tile the brush paints. */
  tile: number;
}

/** A non-empty cell of one layer under the mouse. */
export interface HoveredTile {
  layer: string;

  /** The packed tile, to tell whether the cell changed. */
  tile: number;
  properties: Readonly<Record<string, TilePropertyValue>>;
}

/** The cell under the mouse, and the tile each layer holds there. */
export interface HoveredCell {
  column: number;
  row: number;

  /** The cell's tiles, bottom layer first; empty layers are left out. */
  tiles: readonly HoveredTile[];
}

/**
 * What the tile editor paints, erases and reads: the shown map's layers, the
 * brush, and the cell under the mouse.
 */
export interface TileEditorEcsComponent {
  /** The camera whose view turns the mouse into a world point. */
  camera: number;

  /**
   * The layers of the shown map, bottom to top. They share a layout, so a
   * cell is the same place in each. The right mouse button erases the
   * topmost tile of a cell.
   */
  layers: readonly EditableLayer[];

  /** What the left mouse button paints. */
  brush: TileBrush;

  /**
   * The entity outlining the cell under the mouse: a child of the top
   * layer, so its local position is in that layer's local space.
   */
  cursor: number;

  /** The cell under the mouse. Only the tile editor system writes it. */
  hovered: HoveredCell | null;

  /** Raised by the tile editor system whenever `hovered` changes. */
  readonly hoveredChanged: ParameterizedForgeEvent<HoveredCell | null>;
}

export const tileEditorId =
  createComponentId<TileEditorEcsComponent>('TileEditor');

/**
 * Attaches a {@link TileEditorEcsComponent} to `entity`, with no cell
 * hovered yet.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The camera, the layers to edit, the brush and the cursor.
 * @returns The attached component.
 */
export function addTileEditorComponent(
  world: EcsWorld,
  entity: number,
  options: Pick<
    TileEditorEcsComponent,
    'camera' | 'layers' | 'brush' | 'cursor'
  >,
): TileEditorEcsComponent {
  return world.addComponent(entity, tileEditorId, {
    ...options,
    hovered: null,
    hoveredChanged: new ParameterizedForgeEvent('hoveredCellChanged'),
  });
}
