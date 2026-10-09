import React, { JSX } from 'react';
import { createNineSliceGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createPanelsCode from '!!raw-loader!./_create-panels';
import panelComponentCode from '!!raw-loader!./_panel.component';
import panelSystemCode from '!!raw-loader!./_panel.system';

import {
  DemoLegend,
  DemoPage,
  DemoPanel,
} from '@site/src/components/demo-page';

export default function NineSlice(): JSX.Element {
  return (
    <DemoPage
      slug="nine-slice"
      createGame={createNineSliceGame}
      panels={
        <DemoPanel title="Legend" icon="fa-list">
          <DemoLegend
            items={[
              {
                marker: (
                  <i className="fa-solid fa-arrow-up" aria-hidden="true" />
                ),
                label: 'Plain sprite, stretched',
              },
              {
                marker: (
                  <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                ),
                label: 'Nine-sliced sprite',
              },
            ]}
          />
        </DemoPanel>
      }
      highlights={[
        {
          text: "Both panels use the same 96x96 frame artwork from Kenney's Fantasy UI Borders pack.",
          file: 'create-panels.ts',
        },
        {
          text: 'The plain sprite stretches as a single quad, so its corner notches and frame line smear as it grows.',
          file: 'create-panels.ts',
        },
        {
          text: 'The nine-sliced sprite keeps its corners a fixed size and stretches only its edges and center.',
          file: 'create-panels.ts',
        },
        {
          text: 'A system grows and shrinks both panels together while turning them, so only the slicing differs.',
          file: 'panel.system.ts',
        },
      ]}
      docLinks={[
        {
          label: 'Nine-slice sprites',
          to: '/docs/docs/rendering/nine-slice-sprites',
        },
        { label: 'Sprites', to: '/docs/docs/rendering/sprites' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary: 'Creates the panels and registers the systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-panels.ts',
              summary:
                'Builds a plain and a nine-sliced sprite from the same panel texture.',
              content: createPanelsCode,
            },
          ],
        },
        {
          title: 'Animation',
          files: [
            {
              name: 'panel.component.ts',
              summary: 'The smallest and largest size a panel grows between.',
              content: panelComponentCode,
            },
            {
              name: 'panel.system.ts',
              summary:
                "Animates each panel's width on a sine wave and slowly rotates it.",
              content: panelSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
