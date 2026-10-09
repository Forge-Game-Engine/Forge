import React, { JSX, useCallback, useRef, useState } from 'react';
import { createTextGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createPlaygroundCode from '!!raw-loader!./_create-playground';
import playgroundControlsCode from '!!raw-loader!./_PlaygroundControls';

import { DemoPage, DemoPanel } from '@site/src/components/demo-page';
import {
  applyPlaygroundSettings,
  defaultPlaygroundSettings,
  Playground,
  PlaygroundSettings,
} from './_create-playground';
import { PlaygroundControls } from './_PlaygroundControls';

export default function Text(): JSX.Element {
  const playgroundRef = useRef<Playground | null>(null);
  const [settings, setSettings] = useState(defaultPlaygroundSettings);

  const createGame = useCallback(
    () =>
      createTextGame((playground) => {
        playgroundRef.current = playground;
      }),
    [],
  );

  const handleChange = (change: Partial<PlaygroundSettings>): void => {
    const next = { ...settings, ...change };

    setSettings(next);

    if (playgroundRef.current) {
      applyPlaygroundSettings(playgroundRef.current, next);
    }
  };

  return (
    <DemoPage
      slug="text"
      createGame={createGame}
      panels={
        <DemoPanel title="Playground" icon="fa-sliders">
          <PlaygroundControls settings={settings} onChange={handleChange} />
        </DemoPanel>
      }
      highlights={[
        {
          text: "The text uses the engine's built-in font, a signed distance field atlas that stays sharp at any size.",
          file: 'create-game.ts',
        },
        {
          text: 'Every setting is a field on one text component. The text shaping system reshapes the text whenever a field changes.',
          file: 'create-playground.ts',
        },
        {
          text: 'The dark column is the wrap width. Lines break at the word that would cross it, and horizontal align places each line inside it.',
          file: 'create-playground.ts',
        },
        {
          text: "The orange line is the text's position. Vertical align picks which part of the text sits on it.",
          file: 'create-playground.ts',
        },
      ]}
      docLinks={[
        { label: 'Rendering text', to: '/docs/docs/text/rendering-text' },
        { label: 'Text effects', to: '/docs/docs/text/text-effects' },
        {
          label: 'Loading a font atlas',
          to: '/docs/docs/text/loading-a-font-atlas',
        },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Loads the default font, creates the playground and registers the systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Playground',
          files: [
            {
              name: 'create-playground.ts',
              summary:
                'Creates the text and its guides, and applies the settings to them.',
              content: createPlaygroundCode,
            },
            {
              name: 'PlaygroundControls.tsx',
              summary: 'The settings panel beside the game.',
              content: playgroundControlsCode,
            },
          ],
        },
      ]}
    />
  );
}
