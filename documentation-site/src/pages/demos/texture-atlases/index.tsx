import React, { JSX } from 'react';
import { createTextureAtlasesGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createIslandMapCode from '!!raw-loader!./_create-island-map';
import createShipsCode from '!!raw-loader!./_create-ships';
import shipStyleComponentCode from '!!raw-loader!./_ship-style.component';
import shipStyleSystemCode from '!!raw-loader!./_ship-style.system';

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
          text: 'createAtlasSprite sizes each sprite from its region: at pixelsPerUnit 1, one texel is one world unit.',
          file: 'create-ships.ts',
        },
        {
          text: 'Every tile shares one texture and every ship another, so the whole map draws in one batch and the ships in a second.',
          file: 'create-game.ts',
        },
        {
          text: 'Each ship changes style by assigning another region of the atlas to its sprite.',
          file: 'ship-style.system.ts',
        },
      ]}
      docLinks={[
        {
          label: 'Texture Atlases',
          to: '/docs/docs/rendering/texture-atlases',
        },
        { label: 'Sprites', to: '/docs/docs/rendering/sprites' },
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
                'Builds an atlas of named ships from texel rects and places them by name.',
              content: createShipsCode,
            },
          ],
        },
        {
          title: 'Changing regions',
          files: [
            {
              name: 'ship-style.component.ts',
              summary: 'The regions a ship cycles through.',
              content: shipStyleComponentCode,
            },
            {
              name: 'ship-style.system.ts',
              summary: "Assigns each ship's next region to its sprite.",
              content: shipStyleSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
