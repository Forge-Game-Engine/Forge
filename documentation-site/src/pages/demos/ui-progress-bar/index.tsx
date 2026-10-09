import React, { JSX } from 'react';
import { createProgressBarGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import pulseComponentCode from '!!raw-loader!./_pulse.component';
import pulseSystemCode from '!!raw-loader!./_pulse.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function UiProgressBar(): JSX.Element {
  return (
    <DemoPage
      slug="ui-progress-bar"
      createGame={createProgressBarGame}
      highlights={[
        {
          text: 'A progress bar only shows a value, so it has no interactable component and takes no input.',
          file: 'create-game.ts',
        },
        {
          text: 'The fill keeps its full size and a mask reveals the part the value covers.',
          file: 'create-game.ts',
        },
        {
          text: 'The health bar uses a linear mask; the cooldown ring sets fillShape to a radial one that sweeps clockwise from the top.',
          file: 'create-game.ts',
        },
        {
          text: 'A demo-only pulse system writes both values every frame, and the bars show each write in the same frame.',
          file: 'pulse.system.ts',
        },
      ]}
      docLinks={[{ label: 'Controls', to: '/docs/docs/ui/controls' }]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Creates a linear health bar and a radial cooldown ring, each with a pulse.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Pulse',
          files: [
            {
              name: 'pulse.component.ts',
              summary:
                'The range and speed a progress bar value oscillates at.',
              content: pulseComponentCode,
            },
            {
              name: 'pulse.system.ts',
              summary:
                "Moves each pulsing progress bar's value back and forth over time.",
              content: pulseSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
