import React, { JSX } from 'react';
import { createButtonGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';

import { DemoPage } from '@site/src/components/demo-page';

export default function UiButton(): JSX.Element {
  return (
    <DemoPage
      slug="ui-button"
      createGame={createButtonGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click' }],
          action: 'Press a button',
        },
        { inputs: ['↑↓'], action: 'Move focus' },
        { inputs: ['Enter', 'Space'], action: 'Press the focused button' },
      ]}
      highlights={[
        {
          text: 'Each button comes from one createButton call: a sliced panel sprite, a label and an interactable component.',
          file: 'create-game.ts',
        },
        {
          text: 'A click and Enter or Space on the focused button raise the same onInvoke event, which updates the status text.',
          file: 'create-game.ts',
        },
        {
          text: 'The canvas takes a navigate and a submit input action, so the arrow keys move focus between buttons.',
          file: 'create-game.ts',
        },
        {
          text: 'Hovering a button focuses it too, and its color eases between normal, hover and pressed tints.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        {
          label: 'Buttons and interaction',
          to: '/docs/docs/ui/buttons-and-interaction',
        },
        { label: 'Creating a canvas', to: '/docs/docs/ui/creating-a-canvas' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Wires mouse and keyboard input, then builds three buttons and a status label.',
              content: gameCode,
            },
          ],
        },
      ]}
    />
  );
}
