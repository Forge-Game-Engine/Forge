import React, { JSX } from 'react';
import { createToggleGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';

import { DemoPage } from '@site/src/components/demo-page';

export default function UiToggle(): JSX.Element {
  return (
    <DemoPage
      slug="ui-toggle"
      createGame={createToggleGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click' }],
          action: 'Flip a toggle',
        },
      ]}
      highlights={[
        {
          text: "The 'Mute' toggle has no group, so it flips on and off freely, like a checkbox.",
          file: 'create-game.ts',
        },
        {
          text: "The three 'Difficulty' toggles share a toggle group, which turns them into radio buttons.",
          file: 'create-game.ts',
        },
        {
          text: 'A group keeps exactly one toggle on by default, so turning one on turns the others off.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Toggles', to: '/docs/docs/ui/controls#toggles' },
        {
          label: 'Grouping toggles',
          to: '/docs/docs/ui/controls#grouping-toggles',
        },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Builds a lone checkbox toggle and a three-way radio group with captions.',
              content: gameCode,
            },
          ],
        },
      ]}
    />
  );
}
