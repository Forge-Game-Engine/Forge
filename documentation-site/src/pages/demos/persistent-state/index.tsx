import React, { JSX } from 'react';
import { createPersistentStateGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import settingsCode from '!!raw-loader!./_settings';
import spinnerComponentCode from '!!raw-loader!./_spinner.component';
import spinnerSystemCode from '!!raw-loader!./_spinner.system';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';

const badgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  borderRadius: '50%',
  backgroundColor: 'var(--ifm-color-emphasis-300)',
  fontSize: 12,
};

export default function PersistentState(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Persistent State Demo',
        description:
          'A demo showcasing createPersistentState from the storage module: settings that survive a reload.',
      }}
      header="Persistent State"
      blurb="The size and spin settings are a persistent state stored in localStorage. They're loaded before the game is created, written into the square's component, and stored on every change, so they survive a reload and a later visit. Reset makes them the defaults again and removes the stored entry."
      createGame={createPersistentStateGame}
      interactions={
        <InteractionInstruction
          displayElement={
            <div style={badgeStyle}>
              <i className="fa-solid fa-computer-mouse" />
            </div>
          }
          text="Change the settings, then reload the page."
        />
      }
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'settings.ts', content: settingsCode },
        { name: 'spinner.component.ts', content: spinnerComponentCode },
        { name: 'spinner.system.ts', content: spinnerSystemCode },
      ]}
    />
  );
}
