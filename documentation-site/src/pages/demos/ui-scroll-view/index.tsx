import React, { JSX } from 'react';
import { createScrollViewGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';

import { DemoPage } from '@site/src/components/demo-page';

export default function UiScrollView(): JSX.Element {
  return (
    <DemoPage
      slug="ui-scroll-view"
      createGame={createScrollViewGame}
      controls={[
        {
          inputs: [
            { device: 'mouse', label: 'Drag' },
            { device: 'mouse', label: 'Wheel' },
            { device: 'mouse', label: 'Drag scrollbar' },
          ],
          action: 'Scroll the list',
        },
        { inputs: ['↑', '↓'], action: 'Move focus' },
        {
          inputs: [{ device: 'mouse', label: 'Click' }, 'Enter', 'Space'],
          action: 'Pick a level',
        },
      ]}
      highlights={[
        {
          text: 'createScrollView clips a list of 30 buttons to its viewport with a mask, and lays them out in a column.',
          file: 'create-game.ts',
        },
        {
          text: 'Dragging the list follows the pointer, coasts after a quick release and springs back when pulled past an end.',
          file: 'create-game.ts',
        },
        {
          text: 'A drag that starts on a button scrolls the list instead of clicking the button.',
          file: 'create-game.ts',
        },
        {
          text: 'Moving focus with the arrow keys scrolls the focused button into view.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Scroll views', to: '/docs/docs/ui/scroll-views' },
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
                'Builds the scroll view, its scrollbar and 30 level buttons, and wires mouse and keyboard input.',
              content: gameCode,
            },
          ],
        },
      ]}
    />
  );
}
