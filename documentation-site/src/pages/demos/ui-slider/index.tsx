import React, { JSX } from 'react';
import { createSliderGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';

import { DemoPage } from '@site/src/components/demo-page';

export default function UiSlider(): JSX.Element {
  return (
    <DemoPage
      slug="ui-slider"
      createGame={createSliderGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Drag the handle' }],
          action: 'Change the value',
        },
        {
          inputs: [{ device: 'mouse', label: 'Click the track' }],
          action: 'Jump to a value',
        },
      ]}
      highlights={[
        {
          text: 'createSlider builds a track, a draggable handle and a fill sprite that grows with the value.',
          file: 'create-game.ts',
        },
        {
          text: 'The whole track is the drag surface, so clicking anywhere on it moves the handle there.',
          file: 'create-game.ts',
        },
        {
          text: 'A drag keeps tracking even when the pointer strays above or below the track.',
          file: 'create-game.ts',
        },
        {
          text: 'The value label updates live from the onValueChanged event, and wholeNumbers rounds the value to integers.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Sliders', to: '/docs/docs/ui/controls#sliders' },
        { label: 'Creating a canvas', to: '/docs/docs/ui/creating-a-canvas' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary: 'Builds the slider and a value label that follows it.',
              content: gameCode,
            },
          ],
        },
      ]}
    />
  );
}
