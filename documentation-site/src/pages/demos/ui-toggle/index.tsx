import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createToggleGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';

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

export default function UiToggle(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;
  const createGame = useCallback(
    () => createToggleGame(fontAtlasUrl),
    [fontAtlasUrl],
  );

  return (
    <Demo
      metaData={{
        title: 'UI Toggles',
        description:
          'A demo showcasing checkboxes and radio groups from the ui module: createToggle, UiToggleGroupEcsComponent.',
      }}
      header="UI Toggles"
      blurb="The 'Mute' toggle (createToggle, no group) flips freely, checkbox-style. The three 'Difficulty' toggles share a UiToggleGroupEcsComponent (addUiToggleGroupComponent), making them a radio group - clicking one turns the others off, since a group always has exactly one selection by default (allowSwitchOff: false). Both are the same createToggle/UiToggleEcsComponent underneath; a shared group is the only thing that turns a set of checkboxes into radio buttons."
      createGame={createGame}
      interactions={
        <InteractionInstruction
          displayElement={
            <div style={badgeStyle}>
              <i className="fa-solid fa-computer-mouse" />
            </div>
          }
          text="Click a toggle."
        />
      }
      codeFiles={[{ name: 'game.ts', content: gameCode }]}
    />
  );
}
