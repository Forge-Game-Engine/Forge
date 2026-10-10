import React, { JSX } from 'react';
import { createUiMainMenuGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import mainMenuCode from '!!raw-loader!./_create-main-menu';
import missionBriefCode from '!!raw-loader!./_create-mission-brief';
import flagshipPanelCode from '!!raw-loader!./_create-flagship-panel';
import paletteCode from '!!raw-loader!./_palette';

import { DemoPage } from '@site/src/components/demo-page';

export default function UiMainMenu(): JSX.Element {
  return (
    <DemoPage
      slug="ui-main-menu"
      createGame={createUiMainMenuGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click' }],
          action: 'Choose a menu row or Deploy',
        },
        { inputs: ['↑↓'], action: 'Move focus' },
        { inputs: ['Enter', 'Space'], action: 'Choose the focused item' },
      ]}
      highlights={[
        {
          text: 'Each menu row is a panel given the same interactable and color transition components a button uses, so it can hold an accent, an index and a title.',
          file: 'create-main-menu.ts',
        },
        {
          text: 'A vertical layout group inside a content size fitter stacks the six rows, so no row needs layout math.',
          file: 'create-main-menu.ts',
        },
        {
          text: 'Rows are transparent until hovered or focused; the first row starts focused, which is why it shows blue at rest.',
          file: 'create-game.ts',
        },
        {
          text: 'The ship readout combines a progress bar for fleet strength with a Deploy button.',
          file: 'create-flagship-panel.ts',
        },
        {
          text: 'The canvas uses the fitReferenceResolution scale mode, so the edge-to-edge layout never crops at any window shape.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Layout groups', to: '/docs/docs/ui/layout-groups' },
        {
          label: 'Buttons and interaction',
          to: '/docs/docs/ui/buttons-and-interaction',
        },
        { label: 'Responsive UI', to: '/docs/docs/ui/responsive-ui' },
        { label: 'Controls', to: '/docs/docs/ui/controls' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up input and the canvas, then builds the menu, brief and ship readout.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the screen',
          files: [
            {
              name: 'create-main-menu.ts',
              summary:
                'Builds the left nav panel with its title, six numbered rows and footer.',
              content: mainMenuCode,
            },
            {
              name: 'create-mission-brief.ts',
              summary:
                'Lays out the backdrop circle, mission title and wrapped blurb.',
              content: missionBriefCode,
            },
            {
              name: 'create-flagship-panel.ts',
              summary:
                'Builds the ship placeholder, fleet strength meter and Deploy button.',
              content: flagshipPanelCode,
            },
            {
              name: 'palette.ts',
              summary: 'The shared colors every element on the screen uses.',
              content: paletteCode,
            },
          ],
        },
      ]}
    />
  );
}
