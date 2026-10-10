import React, { JSX } from 'react';
import { createRollingBallGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createTerrainCode from '!!raw-loader!./_create-terrain';
import createPlayerCode from '!!raw-loader!./_create-player';
import createInputsCode from '!!raw-loader!./_create-inputs';
import rollSystemCode from '!!raw-loader!./_roll.system';
import jumpSystemCode from '!!raw-loader!./_jump.system';
import cameraFollowSystemCode from '!!raw-loader!./_camera-follow.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function RollingBall(): JSX.Element {
  return (
    <DemoPage
      slug="rolling-ball"
      createGame={createRollingBallGame}
      controls={[
        { inputs: ['←', 'A'], action: 'Roll left' },
        { inputs: ['→', 'D'], action: 'Roll right' },
        { inputs: ['Space'], action: 'Jump', detail: 'Only on the ground' },
      ]}
      highlights={[
        {
          text: 'The hills are a smooth curve through a few random control points, used for both the TerrainCollider and the drawn mesh, so what you see is what the ball touches.',
          file: 'create-terrain.ts',
        },
        {
          text: 'The terrain mesh tiles a grass border near the surface that blends into a dirt fill below.',
          file: 'create-terrain.ts',
        },
        {
          text: "Rolling sets the target speed of the ball's angular velocity motor, and ordinary friction with the ground turns that spin into movement.",
          file: 'roll.system.ts',
        },
        {
          text: 'The ball can jump only while its contacts list the terrain, and it respawns if it falls off the end.',
          file: 'jump.system.ts',
        },
        {
          text: 'The camera eases after the ball with exponential smoothing.',
          file: 'camera-follow.system.ts',
        },
      ]}
      docLinks={[
        { label: 'Terrain', to: '/docs/docs/physics/terrain' },
        { label: 'Forces', to: '/docs/docs/physics/forces' },
        { label: 'Collisions', to: '/docs/docs/physics/collisions' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Builds the terrain, ball and camera, and registers every system in order.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-terrain.ts',
              summary:
                'Generates the curved hills, their collider and the textured mesh that draws them.',
              content: createTerrainCode,
            },
            {
              name: 'create-player.ts',
              summary:
                'Creates the ball as a rigid body with gravity, friction and a spin motor.',
              content: createPlayerCode,
            },
            {
              name: 'create-inputs.ts',
              summary: 'Binds A/D, the arrow keys and Space to roll and jump.',
              content: createInputsCode,
            },
          ],
        },
        {
          title: 'Systems',
          files: [
            {
              name: 'roll.system.ts',
              summary: "Sets the ball motor's target spin from the roll input.",
              content: rollSystemCode,
            },
            {
              name: 'jump.system.ts',
              summary:
                'Jumps while touching the terrain and respawns the ball if it falls.',
              content: jumpSystemCode,
            },
            {
              name: 'camera-follow.system.ts',
              summary: 'Eases the camera towards the ball every tick.',
              content: cameraFollowSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
