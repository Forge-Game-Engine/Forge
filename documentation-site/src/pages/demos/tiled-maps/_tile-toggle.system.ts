import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  MouseInputSource,
  TriggerAction,
} from '@forge-game-engine/forge/input';
import { colliderId } from '@forge-game-engine/forge/physics';
import {
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  cellToWorld,
  clearTile,
  emptyTile,
  getTile,
  setTile,
  tilemapLayerId,
  worldToCell,
} from '@forge-game-engine/forge/tilemaps';
import { TileToggleEcsComponent, tileToggleId } from './_tile-toggle.component';

/** The inputs the tile toggle reads. */
export interface TileToggleInputs {
  mouse: MouseInputSource;

  /** Toggles the cell under the mouse. */
  toggleInput: TriggerAction;
}

/**
 * Creates the system that toggles the clicked cell of a layer: a click on a
 * tile clears it, and a click on an empty cell places the toggle's tile,
 * unless it would overlap the collider of the entity to keep clear.
 *
 * It reads a click made this frame, so register it in the default group,
 * before `createTilemapColliderEcsSystem` and `createTilemapRenderEcsSystem`:
 * the cell draws as it is now on the frame it's clicked, and collides from
 * the next physics step.
 * @param renderContext - The render context whose canvas the mouse is over.
 * @param inputs - The mouse and the toggle action.
 * @returns The ECS system.
 */
export const createTileToggleEcsSystem = (
  renderContext: RenderContext,
  inputs: TileToggleInputs,
): EcsSystem<[TileToggleEcsComponent]> => ({
  query: [tileToggleId],
  update: (world, { components: [toggles] }) => {
    if (!inputs.toggleInput.isTriggered) {
      return;
    }

    for (const toggle of toggles) {
      const layer = world.getComponent(toggle.layer, tilemapLayerId);

      if (!layer) {
        continue;
      }

      // The mouse, in CSS pixels over the canvas, to a world point through
      // the camera, then to the cell of the layer that holds it.
      const worldPoint = getCameraView(
        world,
        toggle.camera,
        renderContext,
      ).viewportToWorld(inputs.mouse.position);
      const { column, row } = worldToCell(world, toggle.layer, worldPoint);

      if (getTile(layer, column, row) !== emptyTile) {
        clearTile(layer, column, row);

        continue;
      }

      // The layer is unrotated and unscaled, so the cell is its layout's
      // cell size around its center.
      const center = cellToWorld(world, toggle.layer, column, row);
      const halfWidth = layer.tileSet.layout.cellWidth / 2;
      const halfHeight = layer.tileSet.layout.cellHeight / 2;
      const keepClear = world.getComponent(toggle.keepClear, colliderId);

      if (
        keepClear &&
        keepClear.aabb.min.x < center.x + halfWidth &&
        keepClear.aabb.max.x > center.x - halfWidth &&
        keepClear.aabb.min.y < center.y + halfHeight &&
        keepClear.aabb.max.y > center.y - halfHeight
      ) {
        continue;
      }

      setTile(layer, column, row, toggle.tile);
    }
  },
});
