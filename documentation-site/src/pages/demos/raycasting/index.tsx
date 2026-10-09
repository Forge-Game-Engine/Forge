import React, { JSX } from 'react';
import { createRaycastingGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createTargetsCode from '!!raw-loader!./_create-targets';
import rayVisualCode from '!!raw-loader!./_ray-visual';

import { DemoPage } from '@site/src/components/demo-page';

export default function Raycasting(): JSX.Element {
  return (
    <DemoPage
      slug="raycasting"
      createGame={createRaycastingGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Move' }],
          action: 'Aim the ray',
        },
      ]}
      highlights={[
        {
          text: 'Each mouse move casts a ray from a fixed point on the left toward the cursor with the raycast function.',
          file: 'create-game.ts',
        },
        {
          text: 'The closest hit is first in the results; a marker shows its exact point and the ray turns red.',
          file: 'ray-visual.ts',
        },
        {
          text: 'The targets are plain static colliders with no rigid body, which is all a raycast needs.',
          file: 'create-targets.ts',
        },
        {
          text: 'The broad phase still runs every tick, because raycast reads the bounding boxes it keeps up to date.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Raycasting', to: '/docs/docs/physics/raycasting' },
        { label: 'Bodies and shapes', to: '/docs/docs/physics/rigid-bodies' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up the scene and casts a ray toward the cursor on every mouse move.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-targets.ts',
              summary:
                'Places the static circle and square colliders the ray hits.',
              content: createTargetsCode,
            },
            {
              name: 'ray-visual.ts',
              summary:
                'Draws the ray as a stretched sprite and shows a marker at the hit point.',
              content: rayVisualCode,
            },
          ],
        },
      ]}
    />
  );
}
