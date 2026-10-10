import React, { JSX } from 'react';
import { createEcsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createEntityCode from '!!raw-loader!./_create-entity';
import createSpriteCode from '!!raw-loader!./_create-sprite';
import createSystemCode from '!!raw-loader!./_demo.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function Ecs(): JSX.Element {
  return (
    <DemoPage
      slug="ecs"
      createGame={createEcsGame}
      highlights={[
        {
          text: 'createGame gives you a world, and systems are added to it in the order they should run each frame.',
          file: 'create-game.ts',
        },
        {
          text: 'An entity is just a number: the star is built by adding sprite, position and rotation components to it.',
          file: 'create-entity.ts',
        },
        {
          text: 'The demo system queries every entity with a position and rotation, and moves the star in a circle while it spins.',
          file: 'demo.system.ts',
        },
        {
          text: 'Systems write the local pose, and the transform system turns it into the world pose the renderer draws.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'ECS', to: '/docs/docs/ecs' },
        { label: 'Entities', to: '/docs/docs/ecs/entity' },
        { label: 'Components', to: '/docs/docs/ecs/component' },
        { label: 'Systems', to: '/docs/docs/ecs/system' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Creates the world and camera, adds the star and registers the systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Entity and system',
          files: [
            {
              name: 'create-sprite.ts',
              summary: 'Loads the star image as a sprite.',
              content: createSpriteCode,
            },
            {
              name: 'create-entity.ts',
              summary:
                'Creates an entity and adds sprite, position and rotation components.',
              content: createEntityCode,
            },
            {
              name: 'demo.system.ts',
              summary: 'Moves every matching entity in a circle and spins it.',
              content: createSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
