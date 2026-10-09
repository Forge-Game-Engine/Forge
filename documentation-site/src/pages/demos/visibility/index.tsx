import React, { JSX } from 'react';
import { createVisibilityGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import menuCode from '!!raw-loader!./_create-menu';
import beaconCode from '!!raw-loader!./_create-beacon';

import { DemoPage } from '@site/src/components/demo-page';

export default function Visibility(): JSX.Element {
  return (
    <DemoPage
      slug="visibility"
      createGame={createVisibilityGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click' }],
          action: 'Flip a toggle',
        },
        {
          inputs: ['↑', '↓', '←', '→'],
          action: 'Move focus',
          detail: 'Hiding the focused button clears focus',
        },
        { inputs: ['Enter', 'Space'], action: 'Press the focused element' },
      ]}
      highlights={[
        {
          text: "Hiding 'Load game' takes it out of the menu's layout group, so the buttons below move up and the panel shrinks.",
          file: 'create-menu.ts',
        },
        {
          text: 'Hiding the menu hides the panel and everything under it, and its buttons can no longer be hovered, clicked or focused.',
          file: 'create-menu.ts',
        },
        {
          text: "Fading the menu sets a canvas group's alpha instead, so it stays laid out, drawn and clickable.",
          file: 'create-menu.ts',
        },
        {
          text: 'Hiding the beacon hides its lamp and stops its spark emitter, while sparks already in the air fade out.',
          file: 'create-beacon.ts',
        },
      ]}
      docLinks={[
        { label: 'Visibility', to: '/docs/docs/rendering/visibility' },
        {
          label: 'Hiding, fading and tooltips',
          to: '/docs/docs/ui/canvas-groups-and-tooltips',
        },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Builds the menu, the beacon and the toggles that hide and fade them.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-menu.ts',
              summary:
                'A fitted button menu with a visibility component and a canvas group.',
              content: menuCode,
            },
            {
              name: 'create-beacon.ts',
              summary:
                'A beacon with a child lamp and a spark emitter, hidden as one.',
              content: beaconCode,
            },
          ],
        },
      ]}
    />
  );
}
