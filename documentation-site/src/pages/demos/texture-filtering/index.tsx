import React, { JSX } from 'react';
import { createTextureFilteringGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createEntityCode from '!!raw-loader!./_create-entity';
import createSpriteCode from '!!raw-loader!./_create-sprite';

import { Demo } from '@site/src/components/Demo';

export default function Rendering(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Texture Filtering',
        description: 'A demo showcasing how texture filtering works.',
      }}
      header="Texture Filtering"
      blurb="This demo shows how texture filtering works. On the left, the planet is using nearest neighbor filtering (pixelated) and on the planet on the right is using linear filtering."
      createGame={createTextureFilteringGame}
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
      ]}
    />
  );
}
