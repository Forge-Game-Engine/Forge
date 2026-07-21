import React, { JSX } from 'react';
import { createPhysicsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createBoundariesCode from '!!raw-loader!./_create-boundaries';
import createTerrainCode from '!!raw-loader!./_create-terrain';
import spawnShapesCode from '!!raw-loader!./_spawn-shapes';

import { Demo } from '@site/src/components/Demo';

export default function Physics(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Physics Demo',
        description: 'A demo showcasing the physics engine.',
      }}
      header="Physics"
      blurb="This demo showcases the engine's built-in 2D physics: rigid bodies, gravity, collision detection and resolution. A pile of circles and squares falls onto a rolling-hill TerrainShape floor between two walls, bouncing and colliding with the ground, walls and each other until they settle. Click anywhere on the canvas to trigger an explosion that blasts nearby shapes away from the click point."
      createGame={createPhysicsGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-boundaries.ts',
          content: createBoundariesCode,
        },
        {
          name: 'create-terrain.ts',
          content: createTerrainCode,
        },
        {
          name: 'spawn-shapes.ts',
          content: spawnShapesCode,
        },
      ]}
    />
  );
}
