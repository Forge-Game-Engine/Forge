import React, { JSX } from 'react';
import { createChainColliderGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createLevelCode from '!!raw-loader!./_create-level';
import outlineShaderCode from '!!raw-loader!./_outline.shader';
import spawnBodiesSystemCode from '!!raw-loader!./_spawn-bodies.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function ChainColliderDemo(): JSX.Element {
  return (
    <DemoPage
      slug="chain-collider"
      createGame={createChainColliderGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click' }],
          action: 'Drop a box at the cursor',
        },
        { inputs: ['B'], action: 'Drop a ball at the cursor' },
        { inputs: ['Space'], action: 'Fire a fast ball at the thin wall' },
      ]}
      highlights={[
        {
          text: 'The whole level is one ChainCollider on one static entity: the room is a hole loop, and each platform is a solid loop inside it.',
          file: 'create-level.ts',
        },
        {
          text: 'The floor is split into one edge per tile, marked by the dots. Each edge’s neighbors act as ghost edges, so boxes slide across the joints without catching.',
          file: 'create-level.ts',
        },
        {
          text: 'Bodies collide with each edge only from the side its normal faces, and get a contact from each wall in a concave corner.',
          file: 'spawn-bodies.system.ts',
        },
        {
          text: 'Continuous collision detection sweeps the fast ball against the chain, so it stops at the thin wall.',
          file: 'create-game.ts',
        },
        {
          text: 'The outlines are ribbon meshes built from the same loops the collider uses.',
          file: 'create-level.ts',
        },
      ]}
      docLinks={[
        { label: 'Chain colliders', to: '/docs/docs/physics/chain-colliders' },
        { label: 'Bodies and shapes', to: '/docs/docs/physics/rigid-bodies' },
        {
          label: 'Continuous collision detection',
          to: '/docs/docs/physics/continuous-collision-detection',
        },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up the camera, the level, the inputs and the physics systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Level',
          files: [
            {
              name: 'create-level.ts',
              summary:
                'Defines the level’s loops, adds them as one ChainCollider and draws their outlines.',
              content: createLevelCode,
            },
            {
              name: 'outline.shader.ts',
              summary: 'The shaders that draw the outline ribbons.',
              content: outlineShaderCode,
            },
          ],
        },
        {
          title: 'Bodies',
          files: [
            {
              name: 'spawn-bodies.system.ts',
              summary:
                'Drops boxes and balls at the cursor and fires the fast ball.',
              content: spawnBodiesSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
