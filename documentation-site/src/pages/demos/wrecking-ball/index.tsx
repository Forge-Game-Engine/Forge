import React, { JSX } from 'react';
import { createWreckingBallGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createWreckingBallCode from '!!raw-loader!./_create-wrecking-ball';
import armComponentCode from '!!raw-loader!./_arm.component';
import armSystemCode from '!!raw-loader!./_arm.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function WreckingBall(): JSX.Element {
  return (
    <DemoPage
      slug="wrecking-ball"
      createGame={createWreckingBallGame}
      highlights={[
        {
          text: "A heavy ball hangs from the crane's pivot on a revolute joint, which keeps it swinging in an arc.",
          file: 'create-wrecking-ball.ts',
        },
        {
          text: 'Knocking the wall down is ordinary collision resolution between the ball and the light, dynamic bricks.',
          file: 'create-wrecking-ball.ts',
        },
        {
          text: 'The ball is pulled back and released once when the scene is built, then left to settle.',
          file: 'create-wrecking-ball.ts',
        },
        {
          text: 'Joints are invisible, so a demo system stretches and turns a sprite between the pivot and ball every tick.',
          file: 'arm.system.ts',
        },
      ]}
      docLinks={[
        { label: 'Joints', to: '/docs/docs/physics/joints' },
        { label: 'Collisions', to: '/docs/docs/physics/collisions' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up the camera and scene, and registers every system in the order they run.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-wrecking-ball.ts',
              summary: 'Builds the pivot, hinged ball, floor and brick wall.',
              content: createWreckingBallCode,
            },
          ],
        },
        {
          title: 'Drawing the arm',
          files: [
            {
              name: 'arm.component.ts',
              summary:
                'Links an arm sprite to a fixed pivot and a swinging body.',
              content: armComponentCode,
            },
            {
              name: 'arm.system.ts',
              summary:
                'Positions, rotates and stretches the arm between the pivot and ball.',
              content: armSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
