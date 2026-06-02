import React, { JSX } from 'react';
import { createEcsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createEntityCode from '!!raw-loader!./_create-entity';
import createSpriteCode from '!!raw-loader!./_create-sprite';
import createSystemCode from '!!raw-loader!./_demo.system';

import { Demo } from '@site/src/components/Demo';

export default function Rendering(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Entity Component System',
        description: 'A demo showcasing a full space shooter game.',
      }}
      header="Entity Component System"
      blurb="This demo shows how to create a simple ECS world, entity, component and system."
      createGame={createEcsGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-entity.ts',
          content: createEntityCode,
        },
        {
          name: 'create-sprite.ts',
          content: createSpriteCode,
        },
        {
          name: 'demo.system.ts',
          content: createSystemCode,
        },
      ]}
    />
  );
}
