import React, { JSX } from 'react';
import { createSpriteAtlasGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import loadAtlasCode from '!!raw-loader!./_load-atlas';
import spawnPropsCode from '!!raw-loader!./_spawn-props';
import createBurningShipCode from '!!raw-loader!./_create-burning-ship';
import createPanelCode from '!!raw-loader!./_create-panel';

import { DemoPage } from '@site/src/components/demo-page';

export default function SpriteAtlas(): JSX.Element {
  return (
    <DemoPage
      slug="sprite-atlas"
      createGame={createSpriteAtlasGame}
      highlights={[
        {
          text: 'TextureAtlasCache loads one TexturePacker "JSON (Hash)" file and its image, with every region, trim and pivot.',
          file: 'load-atlas.ts',
        },
        {
          text: 'createAtlasSprite draws each prop by its region name, sized to the untrimmed frame, so trimmed island tiles still line up.',
          file: 'spawn-props.ts',
        },
        {
          text: 'createAtlasAnimationClip plays the flames and the blast from trimmed frames found with getAtlasRegionNames, around a pivot at the flame base taken from the file.',
          file: 'create-burning-ship.ts',
        },
        {
          text: "The UI panel nine-slices the atlas's untrimmed panel region through createPanel, and its icons are regions of the same atlas.",
          file: 'create-panel.ts',
        },
        {
          text: 'Every sprite shares the atlas texture, so each camera draws its whole layer in one batch: one for the scene and one for the panel.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        {
          label: 'Texture Atlases',
          to: '/docs/docs/rendering/texture-atlases',
        },
        {
          label: 'Nine-Slice Sprites',
          to: '/docs/docs/rendering/nine-slice-sprites',
        },
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
              summary:
                'Loads the atlas, then draws the scene and the UI panel from it.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Atlas',
          files: [
            {
              name: 'load-atlas.ts',
              summary: 'Loads the TexturePacker atlas and its image.',
              content: loadAtlasCode,
            },
            {
              name: 'spawn-props.ts',
              summary:
                'Draws islands, rocks, flotsam and ships by region name.',
              content: spawnPropsCode,
            },
            {
              name: 'create-burning-ship.ts',
              summary:
                'Plays the flames and the blast from trimmed atlas frames.',
              content: createBurningShipCode,
            },
            {
              name: 'create-panel.ts',
              summary:
                'Nine-slices a UI panel from an atlas region and fills it with icons.',
              content: createPanelCode,
            },
          ],
        },
      ]}
    />
  );
}
