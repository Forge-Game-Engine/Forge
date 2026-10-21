import React, { JSX, useCallback, useRef, useState } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { createTiledMapsGame, TiledMapsDemo } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createInputsCode from '!!raw-loader!./_create-inputs';
import createPlayerCode from '!!raw-loader!./_create-player';
import playerComponentCode from '!!raw-loader!./_player.component';
import playerMoveSystemCode from '!!raw-loader!./_player-move.system';
import tileToggleComponentCode from '!!raw-loader!./_tile-toggle.component';
import tileToggleSystemCode from '!!raw-loader!./_tile-toggle.system';
import colliderOutlineComponentCode from '!!raw-loader!./_collider-outline.component';
import colliderOutlineSystemCode from '!!raw-loader!./_collider-outline.system';
import outlineLineComponentCode from '!!raw-loader!./_outline-line.component';
import outlineShaderCode from '!!raw-loader!./_outline.shader';
import cameraFollowComponentCode from '!!raw-loader!./_camera-follow.component';
import cameraFollowSystemCode from '!!raw-loader!./_camera-follow.system';

import {
  DemoPage,
  DemoPanel,
  DemoSettings,
  DemoToggle,
} from '@site/src/components/demo-page';

export default function TiledMaps(): JSX.Element {
  // The map names its tileset, and the tileset its image, by paths relative
  // to themselves, so the files are served from the static folder as they
  // are rather than through the bundler.
  const mapUrl = useBaseUrl('/tilemaps/tiled-maps/level.tmj');
  const demoRef = useRef<TiledMapsDemo | null>(null);
  const [showOutline, setShowOutline] = useState(false);

  const createGame = useCallback(
    () =>
      createTiledMapsGame(mapUrl, (demo) => {
        demoRef.current = demo;
        setShowOutline(demo.outlineVisibility.visible);
      }),
    [mapUrl],
  );

  const handleOutlineChange = (visible: boolean): void => {
    setShowOutline(visible);

    if (demoRef.current) {
      demoRef.current.outlineVisibility.visible = visible;
    }
  };

  return (
    <DemoPage
      slug="tiled-maps"
      createGame={createGame}
      controls={[
        { inputs: ['A', 'D', '←', '→'], action: 'Walk' },
        { inputs: ['Space', 'W', '↑'], action: 'Jump' },
        {
          inputs: [{ device: 'mouse', label: 'Left button' }],
          action: 'Toggle a solid tile',
          detail:
            'Clears the tile in the clicked cell of the ground layer, or places a stone block in an empty one',
        },
      ]}
      panels={
        <DemoPanel title="Collision" icon="fa-vector-square">
          <DemoSettings>
            <DemoToggle
              label="Show the ground's collider"
              checked={showOutline}
              onChange={handleOutlineChange}
            />
          </DemoSettings>
        </DemoPanel>
      }
      highlights={[
        {
          text: 'The level, its external tileset and the tileset image are Tiled files. TiledMapCache loads them, and spawnTiledMap creates an entity for each tile layer.',
          file: 'create-game.ts',
        },
        {
          text: "The tileset gives the ground's tiles collision shapes in Tiled, rectangles and slopes, so the ground layer gets one ChainCollider outlining them, which the player stands on.",
          file: 'create-game.ts',
        },
        {
          text: 'The water tiles have an animation in Tiled, and collision shapes. Their layer is made a sensor, so the player falls in and is sent back to the start.',
          file: 'player-move.system.ts',
        },
        {
          text: "The player is created after the map, so it draws over the map's layers, and the foreground layer's draw layer puts its grass and fence in front of it.",
          file: 'create-player.ts',
        },
        {
          text: 'A click finds its cell through the camera view and worldToCell, and sets or clears the tile there before the tilemap systems run, so the new tile draws and collides on the same frame.',
          file: 'tile-toggle.system.ts',
        },
      ]}
      docLinks={[
        { label: 'Tilemaps', to: '/docs/docs/tilemaps' },
        {
          label: 'Loading Tiled maps',
          to: '/docs/docs/tilemaps/loading-tiled-maps',
        },
        { label: 'Tile collision', to: '/docs/docs/tilemaps/collision' },
        { label: 'Chain colliders', to: '/docs/docs/physics/chain-colliders' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Loads and spawns the Tiled map, sets up its layers, the player and the camera, and registers the systems in order.',
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
                "Creates the player's body from the map's Player tile object.",
              content: createPlayerCode,
            },
            {
              name: 'player.component.ts',
              summary:
                "The player's speeds, spawn point and the layers it reacts to.",
              content: playerComponentCode,
            },
            {
              name: 'player-move.system.ts',
              summary:
                'Walks and jumps the player, and sends it back to the start from the water.',
              content: playerMoveSystemCode,
            },
            {
              name: 'create-inputs.ts',
              summary:
                'Binds the keys to walking and jumping, and the mouse to toggling tiles.',
              content: createInputsCode,
            },
          ],
        },
        {
          title: 'Editing',
          files: [
            {
              name: 'tile-toggle.component.ts',
              summary:
                'The layer a click edits, the tile it places, and the body it keeps clear.',
              content: tileToggleComponentCode,
            },
            {
              name: 'tile-toggle.system.ts',
              summary:
                'Turns a click into a cell, and clears or places a tile there.',
              content: tileToggleSystemCode,
            },
          ],
        },
        {
          title: 'Collider outline',
          files: [
            {
              name: 'collider-outline.component.ts',
              summary:
                'Which collider to draw, and the collider the lines were built from.',
              content: colliderOutlineComponentCode,
            },
            {
              name: 'collider-outline.system.ts',
              summary:
                "Rebuilds the lines when the ground layer's collider is replaced.",
              content: colliderOutlineSystemCode,
            },
            {
              name: 'outline-line.component.ts',
              summary:
                "One line's geometry, disposed when the line is removed.",
              content: outlineLineComponentCode,
            },
            {
              name: 'outline.shader.ts',
              summary: 'The shaders the lines are drawn with.',
              content: outlineShaderCode,
            },
          ],
        },
        {
          title: 'Camera',
          files: [
            {
              name: 'camera-follow.component.ts',
              summary: 'The entity the camera follows, and where it stops.',
              content: cameraFollowComponentCode,
            },
            {
              name: 'camera-follow.system.ts',
              summary:
                'Moves the camera along X with the player, inside the level.',
              content: cameraFollowSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
