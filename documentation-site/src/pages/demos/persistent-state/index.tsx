import React, { JSX } from 'react';
import { createPersistentStateGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import settingsCode from '!!raw-loader!./_settings';
import spinnerComponentCode from '!!raw-loader!./_spinner.component';
import spinnerSystemCode from '!!raw-loader!./_spinner.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function PersistentState(): JSX.Element {
  return (
    <DemoPage
      slug="persistent-state"
      createGame={createPersistentStateGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Drag the slider' }],
          action: 'Change the size',
        },
        {
          inputs: [{ device: 'mouse', label: 'Click the toggle' }],
          action: 'Turn spinning on or off',
        },
        {
          inputs: [{ device: 'mouse', label: 'Click Reset' }],
          action: 'Restore the defaults',
        },
      ]}
      highlights={[
        {
          text: 'The size and spin settings are a persistent state kept in localStorage, so change them and reload the page to see them kept.',
          file: 'settings.ts',
        },
        {
          text: 'The settings are loaded before the game is created, and a stored value that fails validation falls back to its default.',
          file: 'settings.ts',
        },
        {
          text: "Every change goes through settings.set, which stores it and copies the new values into the square's component.",
          file: 'create-game.ts',
        },
        {
          text: 'Reset restores the defaults and removes the stored entry.',
          file: 'create-game.ts',
        },
        {
          text: 'If storage is unavailable, the settings fall back to memory and last for this visit only.',
          file: 'settings.ts',
        },
      ]}
      docLinks={[
        {
          label: 'Persistent state',
          to: '/docs/docs/storage/persistent-state',
        },
        {
          label: 'Storage backends',
          to: '/docs/docs/storage/storage-backends',
        },
        { label: 'UI controls', to: '/docs/docs/ui/controls' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Loads the settings, builds the square and settings panel, and wires changes to storage.',
              content: gameCode,
            },
            {
              name: 'settings.ts',
              summary:
                'Creates the persistent settings record, with validation and a memory fallback.',
              content: settingsCode,
            },
          ],
        },
        {
          title: 'Spinner',
          files: [
            {
              name: 'spinner.component.ts',
              summary: "The square's size, spin setting and spin speed.",
              content: spinnerComponentCode,
            },
            {
              name: 'spinner.system.ts',
              summary: 'Scales the square and turns it while spin is on.',
              content: spinnerSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
