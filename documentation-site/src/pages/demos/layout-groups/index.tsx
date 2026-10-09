import React, { JSX } from 'react';
import { createLayoutGroupsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import menuCode from '!!raw-loader!./_create-menu';
import toolbarCode from '!!raw-loader!./_create-toolbar';
import inventoryGridCode from '!!raw-loader!./_create-inventory-grid';
import optionsFormCode from '!!raw-loader!./_create-options-form';

import { DemoPage } from '@site/src/components/demo-page';

export default function LayoutGroups(): JSX.Element {
  return (
    <DemoPage
      slug="layout-groups"
      createGame={createLayoutGroupsGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click' }],
          action: 'Use a button, slider or toggle',
        },
        { inputs: ['↑', '↓', '←', '→'], action: 'Move focus' },
        { inputs: ['Enter', 'Space'], action: 'Press the focused element' },
      ]}
      highlights={[
        {
          text: "'Menu' stacks its buttons with a vertical layout group, and a content size fitter shrink-wraps the panel around them.",
          file: 'create-menu.ts',
        },
        {
          text: "'Toolbar' spaces and sizes a row of icons evenly with a horizontal layout group.",
          file: 'create-toolbar.ts',
        },
        {
          text: "'Inventory' places eight cells in a fixed four-column grid, where cellSize alone decides each cell's size.",
          file: 'create-inventory-grid.ts',
        },
        {
          text: "'Options' sizes its label column to the widest label with columnWidthMode 'content', so the controls line up.",
          file: 'create-options-form.ts',
        },
        {
          text: 'No arranged child sets its own position or size; the layout group system computes them every frame.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Layout groups', to: '/docs/docs/ui/layout-groups' },
        { label: 'Anchors and layout', to: '/docs/docs/ui/anchors-and-layout' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up the canvas and input, and builds the four panels.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Panels',
          files: [
            {
              name: 'create-menu.ts',
              summary:
                'A vertical stack of buttons in a panel that fits its content.',
              content: menuCode,
            },
            {
              name: 'create-toolbar.ts',
              summary: 'A horizontal row of evenly spaced icons.',
              content: toolbarCode,
            },
            {
              name: 'create-inventory-grid.ts',
              summary: 'Eight fixed-size cells in a four-column grid.',
              content: inventoryGridCode,
            },
            {
              name: 'create-options-form.ts',
              summary:
                'A label and control form whose label column sizes to its content.',
              content: optionsFormCode,
            },
          ],
        },
      ]}
    />
  );
}
