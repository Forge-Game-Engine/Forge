import React, { JSX } from 'react';
import { createTextureAtlasesGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createIslandMapCode from '!!raw-loader!./_create-island-map';
import createShipsCode from '!!raw-loader!./_create-ships';

import { DemoPage } from '@site/src/components/demo-page';

export default function TextureAtlases(): JSX.Element {
  return (
    <DemoPage
      slug="texture-atlases"
      createGame={createTextureAtlasesGame}
      highlights={[
        {
          text: 'createGridTextureAtlas cuts the tile sheet into 64 x 64 cells, and the map places each tile by its index.',
          file: 'create-island-map.ts',
        },
        {
          text: "createTextureAtlas builds the ships atlas from named texel rects copied out of the sheet's packing data.",
          file: 'create-ships.ts',
        },
        {
          text: "createAtlasSprite sizes each sprite from its region: at pixelsPerUnit 64, a 64 x 64 tile is one world unit, and the camera's default view is 10 world units tall.",
          file: 'create-island-map.ts',
        },
        {
          text: 'Every tile shares one texture and every ship another, so the whole map draws in one batch and the ships in a second.',
          file: 'create-game.ts',
        },
        {
          text: "Each kind of ship's regions are an animation clip, so the sprite animation system assigns each ship another region every two seconds.",
          file: 'create-ships.ts',
        },
      ]}
      docLinks={[
        {
          label: 'Texture Atlases',
          to: '/docs/docs/rendering/texture-atlases',
        },
        { label: 'Sprites', to: '/docs/docs/rendering/sprites' },
        {
          label: 'Sprite Animations',
          to: '/docs/docs/animations/sprite-animations',
        },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary: 'Draws the island map, then the ships on top of it.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Atlases',
          files: [
            {
              name: 'create-island-map.ts',
              summary:
                'Cuts the tile sheet into a grid atlas and draws a map by tile index.',
              content: createIslandMapCode,
            },
            {
              name: 'create-ships.ts',
              summary:
                'Builds an atlas of named ships from texel rects, and animates each ship through its kind of regions.',
              content: createShipsCode,
            },
          ],
        },
      ]}
    />
  );
}
