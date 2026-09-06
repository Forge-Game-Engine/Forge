import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createDropdownGame } from './_create-game';
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

export default function UiDropdown(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;
  const createGame = useCallback(
    () => createDropdownGame(fontAtlasUrl),
    [fontAtlasUrl],
  );

  return (
    <Demo
      metaData={{
        title: 'UI Dropdown',
        description:
          'A demo showcasing createDropdown from the ui module: a header button showing the selected option, plus a click-to-open list of option rows.',
      }}
      header="UI Dropdown"
      blurb="createDropdown builds a header (an ordinary createButton showing the currently-selected option) with a UiDropdownEcsComponent, plus one option-row button per entry - stacked below the header and hidden until it's clicked open. A chevron on the header's right edge flips between v (closed) and ^ (open) as the list toggles. Selecting an option updates the header's label, raises onValueChanged, and closes the list. Clicking outside the open list doesn't close it - only clicking the header again or selecting an option does."
      createGame={createGame}
      interactions={
        <InteractionInstruction
          displayElement={
            <div style={badgeStyle}>
              <i className="fa-solid fa-computer-mouse" />
            </div>
          }
          text="Click the dropdown to open it, then pick an option."
        />
      }
      codeFiles={[{ name: 'game.ts', content: gameCode }]}
    />
  );
}
