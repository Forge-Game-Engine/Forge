import React, { JSX } from 'react';
import { createTextureFilteringGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createEntityCode from '!!raw-loader!./_create-entity';
import createSpriteCode from '!!raw-loader!./_create-sprite';

import { DemoPage } from '@site/src/components/demo-page';

export default function TextureFiltering(): JSX.Element {
  return (
    <DemoPage
      slug="texture-filtering"
      createGame={createTextureFilteringGame}
      highlights={[
        {
          text: 'Both planets load the same small pixel-art image and scale it up 4.5 times.',
          file: 'create-entity.ts',
        },
        {
          text: "The left planet's texture uses 'nearest' filtering, which keeps hard, blocky pixels.",
          file: 'create-sprite.ts',
        },
        {
          text: "The right planet's texture uses 'linear' filtering, which blends neighboring pixels into a smooth, blurry image.",
          file: 'create-sprite.ts',
        },
      ]}
      docLinks={[{ label: 'Textures', to: '/docs/docs/rendering/textures' }]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary: 'Creates a pixelated and a smooth planet side by side.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-sprite.ts',
              summary:
                "Loads the planet texture with 'nearest' or 'linear' filtering.",
              content: createSpriteCode,
            },
            {
              name: 'create-entity.ts',
              summary: 'Places a planet sprite, scaled up and rotated.',
              content: createEntityCode,
            },
          ],
        },
      ]}
    />
  );
}
