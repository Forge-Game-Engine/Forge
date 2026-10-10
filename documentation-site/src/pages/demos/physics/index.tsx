import React, { JSX } from 'react';
import { createPhysicsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createBoundariesCode from '!!raw-loader!./_create-boundaries';
import spawnShapesCode from '!!raw-loader!./_spawn-shapes';

import { DemoPage } from '@site/src/components/demo-page';

export default function Physics(): JSX.Element {
  return (
    <DemoPage
      slug="physics"
      createGame={createPhysicsGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click' }],
          action: 'Trigger an explosion',
        },
      ]}
      highlights={[
        {
          text: 'Three hundred circles, squares, triangles and planks are dynamic rigid bodies that fall under gravity and pile up.',
          file: 'spawn-shapes.ts',
        },
        {
          text: 'The floor and walls have colliders but no rigid body, so they are static and never move.',
          file: 'create-boundaries.ts',
        },
        {
          text: 'Broad phase, narrow phase and collision resolution run each tick to find touching shapes and push them apart.',
          file: 'create-game.ts',
        },
        {
          text: 'A click converts the cursor to world space and applies an explosive force that blasts nearby shapes away.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Physics', to: '/docs/docs/physics' },
        { label: 'Bodies and shapes', to: '/docs/docs/physics/rigid-bodies' },
        { label: 'Collisions', to: '/docs/docs/physics/collisions' },
        { label: 'Forces', to: '/docs/docs/physics/forces' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up the camera and scene, registers the physics systems and handles clicks.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-boundaries.ts',
              summary:
                'Adds the static floor and side walls that hold the pile.',
              content: createBoundariesCode,
            },
            {
              name: 'spawn-shapes.ts',
              summary:
                'Spawns hundreds of random shapes, pairing each sprite with a matching collider.',
              content: spawnShapesCode,
            },
          ],
        },
      ]}
    />
  );
}
