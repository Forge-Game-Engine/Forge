import { positionId } from '@forge-game-engine/forge/common';
import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import { HoldAction, MouseInputSource } from '@forge-game-engine/forge/input';
import {
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  cellToLocal,
  clearTile,
  emptyTile,
  getTile,
  getTileData,
  setTile,
  TilemapLayerEcsComponent,
  tilemapLayerId,
  worldToCell,
} from '@forge-game-engine/forge/tilemaps';
import {
  EditableLayer,
  HoveredCell,
  HoveredTile,
  TileEditorEcsComponent,
  tileEditorId,
} from './_tile-editor.component';

/** The inputs the tile editor reads. */
export interface TileEditorInputs {
  mouse: MouseInputSource;

  /** Held to paint the brush's tile into every cell the mouse passes. */
  paintInput: HoldAction;

  /** Held to erase the topmost tile of every cell the mouse passes. */
  eraseInput: HoldAction;
}

const getLayer = (
  world: EcsWorld,
  entity: number,
): TilemapLayerEcsComponent => {
  const layer = world.getComponent(entity, tilemapLayerId);

  if (!layer) {
    throw new Error(`Entity ${entity} has no tilemap layer to edit.`);
  }

  return layer;
};

/** Clears the cell in the topmost layer that has a tile there. */
const eraseTopTile = (
  world: EcsWorld,
  layers: readonly EditableLayer[],
  column: number,
  row: number,
): void => {
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = getLayer(world, layers[i].entity);

    if (getTile(layer, column, row) !== emptyTile) {
      clearTile(layer, column, row);

      return;
    }
  }
};

/** Reads each layer's tile in the cell and the properties its tile set gives it. */
const readCell = (
  world: EcsWorld,
  layers: readonly EditableLayer[],
  column: number,
  row: number,
): HoveredCell => {
  const tiles: HoveredTile[] = [];

  for (const { name, entity } of layers) {
    const layer = getLayer(world, entity);
    const tile = getTile(layer, column, row);

    if (tile !== emptyTile) {
      tiles.push({
        layer: name,
        tile,
        properties: getTileData(layer.tileSet, tile).properties,
      });
    }
  }

  return { column, row, tiles };
};

const isSameCell = (a: HoveredCell | null, b: HoveredCell): boolean =>
  a !== null &&
  a.column === b.column &&
  a.row === b.row &&
  a.tiles.length === b.tiles.length &&
  a.tiles.every((tile, i) => tile.tile === b.tiles[i].tile);

const updateEditor = (
  world: EcsWorld,
  renderContext: RenderContext,
  inputs: TileEditorInputs,
  editor: TileEditorEcsComponent,
): void => {
  const topLayer = editor.layers[editor.layers.length - 1].entity;

  // The mouse, in CSS pixels over the canvas, to a world point through the
  // camera, then to the cell of the top layer that holds it.
  const worldPoint = getCameraView(
    world,
    editor.camera,
    renderContext,
  ).viewportToWorld(inputs.mouse.position);
  const { column, row } = worldToCell(world, topLayer, worldPoint);

  if (inputs.paintInput.isHeld) {
    // Setting a cell to the tile it already holds changes nothing, so
    // holding the button over one cell doesn't rebuild its chunk.
    const { layer, tile } = editor.brush;

    setTile(getLayer(world, layer), column, row, tile);
  } else if (inputs.eraseInput.isHeld) {
    eraseTopTile(world, editor.layers, column, row);
  }

  const cursorPosition = world.getComponent(editor.cursor, positionId);

  if (cursorPosition) {
    const center = cellToLocal(getLayer(world, topLayer), column, row);

    cursorPosition.local.x = center.x;
    cursorPosition.local.y = center.y;
  }

  const hovered = readCell(world, editor.layers, column, row);

  if (!isSameCell(editor.hovered, hovered)) {
    editor.hovered = hovered;
    editor.hoveredChanged.raise(hovered);
  }
};

/**
 * Creates the system that edits the shown map with the mouse. Each tick it
 * finds the cell under the mouse with `worldToCell`, paints the brush's tile
 * there while the paint input is held or erases the topmost tile while the
 * erase input is held, moves the cursor onto the cell, and records the
 * cell's tiles and their properties in `hovered`.
 *
 * Register it before `createTilemapRenderEcsSystem`, so a painted tile
 * draws in the frame it's painted.
 * @param renderContext - The render context whose canvas the mouse is over.
 * @param inputs - The mouse and the paint and erase actions.
 * @returns The tile editor ECS system.
 */
export const createTileEditorEcsSystem = (
  renderContext: RenderContext,
  inputs: TileEditorInputs,
): EcsSystem<[TileEditorEcsComponent]> => ({
  query: [tileEditorId],
  update: (world, { components: [editors] }) => {
    for (const editor of editors) {
      updateEditor(world, renderContext, inputs, editor);
    }
  },
});
