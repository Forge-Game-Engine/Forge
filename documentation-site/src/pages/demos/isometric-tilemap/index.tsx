import React, { JSX, useCallback } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { createIsometricTilemapGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createInputsCode from '!!raw-loader!./_create-inputs';
import createPlayerCode from '!!raw-loader!./_create-player';
import playerComponentCode from '!!raw-loader!./_player.component';
import playerMoveSystemCode from '!!raw-loader!./_player-move.system';
import cellCursorComponentCode from '!!raw-loader!./_cell-cursor.component';
import cellCursorSystemCode from '!!raw-loader!./_cell-cursor.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function IsometricTilemap(): JSX.Element {
  // The map names its tilesets, and each tileset its image, by paths
  // relative to themselves, so the files are served from the static folder
  // as they are rather than through the bundler.
  const mapUrl = useBaseUrl('/tilemaps/isometric-tilemap/courtyard.tmj');

  const createGame = useCallback(
    () => createIsometricTilemapGame(mapUrl),
    [mapUrl],
  );

  return (
    <DemoPage
      slug="isometric-tilemap"
      createGame={createGame}
      controls={[
        {
          inputs: ['W', 'A', 'S', 'D', '↑', '←', '↓', '→'],
          action: 'Walk',
          detail: 'Along the screen: up, left, down and right',
        },
        {
          inputs: [{ device: 'mouse', label: 'Move' }],
          action: 'Highlight a cell',
        },
        {
          inputs: [{ device: 'mouse', label: 'Left button' }],
          action: 'Toggle a wall',
          detail:
            'Clears the wall, crate or tree in the clicked cell, or builds a stone wall in an empty one',
        },
      ]}
      highlights={[
        {
          text: 'The courtyard is a Tiled isometric map with 64 by 32 cells and external tilesets. spawnTiledMap gives it an isometric layout, and creates an entity for its Floor and Walls layers.',
          file: 'create-game.ts',
        },
        {
          text: "The Walls layer sets ySortChildren, so under the camera's ySort its walls, crates and trees draw one row of cells at a time, and the player draws behind the rows below its feet and in front of the rows above.",
          file: 'create-game.ts',
        },
        {
          text: "The walls, crates and trees have collision shapes on their bases in Tiled, and the water's shape covers its cell, so both layers get a collider made of diamonds. The player's circle body slides along it.",
          file: 'create-player.ts',
        },
        {
          text: 'The mouse goes through the camera view to a world point, worldToCell finds the diamond holding it, and the highlight moves to that cell with cellToWorld.',
          file: 'cell-cursor.system.ts',
        },
        {
          text: 'A click sets or clears the cell before the tilemap systems run, so the wall draws and sorts on the frame it is clicked, and collides from the next fixed physics step.',
          file: 'cell-cursor.system.ts',
        },
      ]}
      docLinks={[
        { label: 'Isometric maps', to: '/docs/docs/tilemaps/isometric-maps' },
        {
          label: 'Loading Tiled maps',
          to: '/docs/docs/tilemaps/loading-tiled-maps',
        },
        {
          label: 'Y-sorting tiles with characters',
          to: '/docs/docs/tilemaps/rendering#y-sorting-tiles-with-characters',
        },
        { label: 'Tile collision', to: '/docs/docs/tilemaps/collision' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Loads and spawns the Tiled map, y-sorts its walls layer, sets up the player, the camera and the cell cursor, and registers the systems in order.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Player',
          files: [
            {
              name: 'create-player.ts',
              summary:
                "Creates the player's sprite and circle body at its feet, from the map's Player tile object.",
              content: createPlayerCode,
            },
            {
              name: 'player.component.ts',
              summary: "The player's walking speed.",
              content: playerComponentCode,
            },
            {
              name: 'player-move.system.ts',
              summary: "Sets the player's velocity from the walk keys.",
              content: playerMoveSystemCode,
            },
            {
              name: 'create-inputs.ts',
              summary:
                'Binds the keys to walking, and the mouse to toggling walls.',
              content: createInputsCode,
            },
          ],
        },
        {
          title: 'Picking cells',
          files: [
            {
              name: 'cell-cursor.component.ts',
              summary:
                'The layer the mouse picks cells of, the highlight, the tile a click places and the body it keeps clear.',
              content: cellCursorComponentCode,
            },
            {
              name: 'cell-cursor.system.ts',
              summary:
                'Turns the mouse into a cell, moves the highlight onto it, and clears or places a wall there on a click.',
              content: cellCursorSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
