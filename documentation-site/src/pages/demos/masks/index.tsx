import React, { JSX } from 'react';
import { createMasksGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import maskedContentCode from '!!raw-loader!./_create-masked-content';
import maskPulseComponentCode from '!!raw-loader!./_mask-pulse.component';
import maskPulseSystemCode from '!!raw-loader!./_mask-pulse.system';
import scrollComponentCode from '!!raw-loader!./_scroll.component';
import scrollSystemCode from '!!raw-loader!./_scroll.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function Masks(): JSX.Element {
  return (
    <DemoPage
      slug="masks"
      createGame={createMasksGame}
      highlights={[
        {
          text: 'A mask clips the sprites and text of its entity and all of its descendants.',
          file: 'create-masked-content.ts',
        },
        {
          text: 'On the left, a list taller than its viewport scrolls through a rect mask and is clipped to it.',
          file: 'scroll.system.ts',
        },
        {
          text: 'Top right, a linear mask reveals a full-size nine-slice bar, so its rounded ends never squash.',
          file: 'create-masked-content.ts',
        },
        {
          text: 'Bottom right, a radial mask over three quarters of a turn fills an arc gauge.',
          file: 'create-masked-content.ts',
        },
        {
          text: "A small system animates the fills by writing each mask's amount.",
          file: 'mask-pulse.system.ts',
        },
      ]}
      docLinks={[
        { label: 'Masks', to: '/docs/docs/rendering/masks' },
        {
          label: 'Nine-slice sprites',
          to: '/docs/docs/rendering/nine-slice-sprites',
        },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary: 'Builds the masked scenes and registers the systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-masked-content.ts',
              summary:
                'Creates the scrolling list, the linear fill bar and the radial gauge.',
              content: maskedContentCode,
            },
          ],
        },
        {
          title: 'Animation',
          files: [
            {
              name: 'scroll.component.ts',
              summary:
                'Settings for scrolling an entity upward and wrapping it.',
              content: scrollComponentCode,
            },
            {
              name: 'scroll.system.ts',
              summary: 'Scrolls the list upward and wraps it back around.',
              content: scrollSystemCode,
            },
            {
              name: 'mask-pulse.component.ts',
              summary: 'How fast a linear or radial mask fills and empties.',
              content: maskPulseComponentCode,
            },
            {
              name: 'mask-pulse.system.ts',
              summary:
                "Sweeps each pulsing mask's amount between 0 and 1 and back.",
              content: maskPulseSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
