import React, { JSX, useCallback } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { createIsometricPathFindingGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createInputsCode from '!!raw-loader!./_create-inputs';
import createPlayerCode from '!!raw-loader!./_create-player';
import playerComponentCode from '!!raw-loader!./_player.component';
import playerMoveSystemCode from '!!raw-loader!./_player-move.system';
import cellCursorComponentCode from '!!raw-loader!./_cell-cursor.component';
import cellCursorSystemCode from '!!raw-loader!./_cell-cursor.system';
import navigationComponentCode from '!!raw-loader!./_navigation.component';
import bakeGridSystemCode from '!!raw-loader!./_bake-grid.system';
import findPathSystemCode from '!!raw-loader!./_find-path.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function IsometricPathFinding(): JSX.Element {
  // The isometric tilemap demo's courtyard, served from the static folder
  // with its tilesets and images beside it.
  const mapUrl = useBaseUrl('/tilemaps/isometric-tilemap/courtyard.tmj');

  const createGame = useCallback(
    () => createIsometricPathFindingGame(mapUrl),
    [mapUrl],
  );

  return (
    <DemoPage
      slug="isometric-path-finding"
      createGame={createGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Move' }],
          action: 'Choose the goal',
          detail: 'The path runs from the player to the cell under the mouse',
        },
        {
          inputs: [{ device: 'mouse', label: 'Left button' }],
          action: 'Toggle a wall',
          detail:
            'Clears the wall, crate or tree in the clicked cell, or builds a stone wall in an empty one',
        },
        {
          inputs: ['W', 'A', 'S', 'D', '↑', '←', '↓', '→'],
          action: 'Walk',
          detail: 'Along the screen: up, left, down and right',
        },
      ]}
      highlights={[
        {
          text: "The navigation grid takes the map's isometric layout, its cells from (0, 0) to the map's size, and the Floor layer's position as its origin, so its cells are the map's diamonds.",
          file: 'create-game.ts',
        },
        {
          text: "markGridFromColliders blocks every cell the walls' and the water's collision shapes overlap. The grid is baked again whenever the Walls layer's collider is rebuilt.",
          file: 'bake-grid.system.ts',
        },
        {
          text: "applyTilemapNavigationCosts gives each cell the navigationCost of the Floor tile under it. The stone path's tile has a navigationCost of 0.5 in Tiled, so walking on it costs half as much as walking on grass.",
          file: 'bake-grid.system.ts',
        },
        {
          text: "findGridPath runs from the player to the hovered cell every frame. A step costs the world distance between cell centres times the entered cell's cost, so the path takes the stone path when that's cheaper than the shortest way.",
          file: 'find-path.system.ts',
        },
        {
          text: 'A clicked wall goes into the layer before its collider is rebuilt and the grid is baked, so the path goes round it on the frame it is clicked.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Navigation grids', to: '/docs/docs/navigation/grids' },
        {
          label: 'Blocking cells from colliders',
          to: '/docs/docs/navigation/colliders',
        },
        {
          label: 'Navigation over tile layers',
          to: '/docs/docs/tilemaps/navigation',
        },
        { label: 'Isometric maps', to: '/docs/docs/tilemaps/isometric-maps' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Loads and spawns the Tiled map, creates the player and the camera, registers the systems in order, and after one tick creates the navigation grid with its layout and cells, and the path markers.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Navigation',
          files: [
            {
              name: 'navigation.component.ts',
              summary:
                'The grid, the walls and floor layers it is baked from, the collider version it was last baked at, and the path markers.',
              content: navigationComponentCode,
            },
            {
              name: 'bake-grid.system.ts',
              summary:
                "Resets the grid, then bakes the map's colliders and the floor tiles' costs into it when the walls change.",
              content: bakeGridSystemCode,
            },
            {
              name: 'find-path.system.ts',
              summary:
                'Finds the path from the player to the hovered cell and puts a marker on each of its cell centres.',
              content: findPathSystemCode,
            },
          ],
        },
        {
          title: 'Picking cells',
          files: [
            {
              name: 'cell-cursor.component.ts',
              summary:
                'The layer the mouse picks cells of, the cell under the mouse, the tile a click places and the body it keeps clear.',
              content: cellCursorComponentCode,
            },
            {
              name: 'cell-cursor.system.ts',
              summary:
                'Turns the mouse into a cell, and clears or places a wall there on a click.',
              content: cellCursorSystemCode,
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
      ]}
    />
  );
}
