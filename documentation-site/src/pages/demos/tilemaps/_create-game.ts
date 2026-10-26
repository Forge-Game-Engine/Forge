import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  Color,
  createCamera,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createTilemapRenderEcsSystem } from '@forge-game-engine/forge/tilemaps';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createInputs } from './_create-inputs';
import { DemoMap, showMap } from './_demo-map';
import { createIsometricMap } from './_isometric-map';
import { createOrthogonalMap } from './_orthogonal-map';
import {
  addTileEditorComponent,
  TileEditorEcsComponent,
} from './_tile-editor.component';
import { createTileEditorEcsSystem } from './_tile-editor.system';
import { createWalkEcsSystem } from './_walk.system';

/** The demo's two maps. */
export type MapKind = 'orthogonal' | 'isometric';

/** What the page changes and reads while the demo runs. */
export interface TilemapsDemo {
  maps: Readonly<Record<MapKind, DemoMap>>;
  editor: TileEditorEcsComponent;
}

/**
 * Builds the tilemaps demo: an orthogonal map with a ground and a cover
 * layer and a character walking between them, an isometric map with a
 * character walking among tall walls that sort with it row by row, and a
 * tile editor that paints, erases and reads the shown map's cells with the
 * mouse.
 * @param onReady - Called with the maps and the editor once they exist, so
 * the page can switch maps, pick brushes and show the hovered cell.
 * @returns The created game.
 */
export const createTilemapsGame = async (
  onReady: (demo: TilemapsDemo) => void,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  // `ySort` sorts the isometric map's wall rows and character by their Y.
  // The orthogonal map's root doesn't set `ySortChildren`, so it sorts as
  // one unit and draws in hierarchy order.
  const camera = createCamera(world, {
    isStatic: true,
    clearColor: new Color(0.09, 0.11, 0.16, 1),
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
    ySort: true,
  });

  const { moveInput, editorInputs } = createInputs(world, time, game);

  const maps = {
    orthogonal: createOrthogonalMap(world, renderContext),
    isometric: createIsometricMap(world, renderContext),
  };

  const editor = addTileEditorComponent(world, world.createEntity(), {
    camera,
    layers: maps.orthogonal.layers,
    brush: maps.orthogonal.brushes[0],
    cursor: maps.orthogonal.cursor,
  });

  showMap(editor, Object.values(maps), maps.orthogonal);
  onReady({ maps, editor });

  world.addSystem(createWalkEcsSystem(time, moveInput));
  world.addSystem(createTileEditorEcsSystem(renderContext, editorInputs));
  // After the systems that edit tiles, so a painted tile draws this frame,
  // and before the transform system, so new chunk entities get their world
  // transform before they're drawn. It reads `time` to play animated tiles
  // such as the water.
  world.addSystem(createTilemapRenderEcsSystem(renderContext, time));
  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
