import React, { JSX } from 'react';
import { createDropdownGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';

import { DemoPage } from '@site/src/components/demo-page';

export default function UiDropdown(): JSX.Element {
  return (
    <DemoPage
      slug="ui-dropdown"
      createGame={createDropdownGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click the header' }],
          action: 'Open or close the list',
        },
        {
          inputs: [{ device: 'mouse', label: 'Click an option' }],
          action: 'Select it',
        },
      ]}
      highlights={[
        {
          text: 'One createDropdown call builds a header button showing the selected option, plus one hidden button per option below it.',
          file: 'create-game.ts',
        },
        {
          text: 'Clicking the header shows or hides the list, and the chevron on its right edge flips to match.',
          file: 'create-game.ts',
        },
        {
          text: "Picking an option updates the header's label, raises onValueChanged and closes the list.",
          file: 'create-game.ts',
        },
        {
          text: 'Clicking outside the open list leaves it open; only the header or an option closes it.',
        },
      ]}
      docLinks={[
        { label: 'Controls', to: '/docs/docs/ui/controls' },
        {
          label: 'Buttons and interaction',
          to: '/docs/docs/ui/buttons-and-interaction',
        },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up mouse input and a UI canvas, then creates a four-option dropdown.',
              content: gameCode,
            },
          ],
        },
      ]}
    />
  );
}
