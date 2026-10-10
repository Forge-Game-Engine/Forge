import React, { JSX } from 'react';
import { createCanvasGroupGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';

import { DemoPage } from '@site/src/components/demo-page';

export default function UiCanvasGroup(): JSX.Element {
  return (
    <DemoPage
      slug="ui-canvas-group"
      createGame={createCanvasGroupGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click' }],
          action: "Toggle 'Disable modal'",
        },
        {
          inputs: [{ device: 'mouse', label: 'Click' }],
          action: 'Press Confirm',
          detail: 'Does nothing while the modal is disabled',
        },
      ]}
      highlights={[
        {
          text: 'One canvas group sits on the modal panel, and the toggle changes only that component.',
          file: 'create-game.ts',
        },
        {
          text: 'The fade and disable reach every descendant: the nested card, its labels and the Confirm button two or three levels down.',
          file: 'create-game.ts',
        },
        {
          text: 'While disabled, Confirm really ignores clicks, because the group turns off interactable and blocksRaycasts, not just alpha.',
          file: 'create-game.ts',
        },
        {
          text: 'The toggle lives outside the group, so it stays opaque and clickable the whole time.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        {
          label: 'Hiding, fading and tooltips',
          to: '/docs/docs/ui/canvas-groups-and-tooltips',
        },
        { label: 'Controls', to: '/docs/docs/ui/controls' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Builds the modal with its canvas group, the nested card and the toggle that disables it.',
              content: gameCode,
            },
          ],
        },
      ]}
    />
  );
}
