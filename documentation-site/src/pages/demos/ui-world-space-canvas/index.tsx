import React, { JSX } from 'react';
import { createWorldSpaceCanvasGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';

import { DemoPage } from '@site/src/components/demo-page';

export default function UiWorldSpaceCanvas(): JSX.Element {
  return (
    <DemoPage
      slug="ui-world-space-canvas"
      createGame={createWorldSpaceCanvasGame}
      highlights={[
        {
          text: "Each health bar is a UI canvas with renderMode 'worldSpace', drawn by the same camera as the enemies.",
          file: 'create-game.ts',
        },
        {
          text: "The left bar is attached with world.setParent, so it inherits the enemy's rotation and spins with it.",
          file: 'create-game.ts',
        },
        {
          text: 'The right bar has no parent and sits above its enemy through anchoredPosition, so it stays upright.',
          file: 'create-game.ts',
        },
        {
          text: 'To follow a moving target, a system of your own writes anchoredPosition from its position every frame.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        {
          label: 'Creating a world-space canvas',
          to: '/docs/docs/ui/creating-a-canvas#creating-a-world-space-canvas',
        },
        { label: 'Transforms', to: '/docs/docs/common/transforms' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Builds two spinning enemies, each with a world-space health bar attached a different way.',
              content: gameCode,
            },
          ],
        },
      ]}
    />
  );
}
