import React, { JSX } from 'react';
import { createNewtonsCradleGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createCradleCode from '!!raw-loader!./_create-cradle';
import armComponentCode from '!!raw-loader!./_arm.component';
import armSystemCode from '!!raw-loader!./_arm.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function NewtonsCradle(): JSX.Element {
  return (
    <DemoPage
      slug="newtons-cradle"
      createGame={createNewtonsCradleGame}
      highlights={[
        {
          text: 'Each of the five balls hangs from its own pivot on a revolute joint, which only keeps it swinging in an arc.',
          file: 'create-cradle.ts',
        },
        {
          text: 'Momentum passes down the row through ordinary collision resolution between the balls, helped by a high restitution.',
          file: 'create-cradle.ts',
        },
        {
          text: 'A tiny gap between resting balls makes each impact a separate event, so only the last ball pops out.',
          file: 'create-cradle.ts',
        },
        {
          text: 'The leftmost ball is released once when the scene is built, then the cradle settles on its own.',
          file: 'create-cradle.ts',
        },
        {
          text: 'Joints are invisible, so a demo system stretches and turns a sprite between each pivot and ball every tick.',
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
                'Sets up the camera and cradle, and registers every system in the order they run.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-cradle.ts',
              summary:
                'Builds the frame and five hinged balls, with the first one pulled back.',
              content: createCradleCode,
            },
          ],
        },
        {
          title: 'Drawing the arms',
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
                'Positions, rotates and stretches each arm between its pivot and ball.',
              content: armSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
