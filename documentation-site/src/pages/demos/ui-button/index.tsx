import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createButtonGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { KeyboardKey } from '@site/src/components/_KeyboardKey';

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

export default function UiButton(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;
  const createGame = useCallback(
    () => createButtonGame(fontAtlasUrl),
    [fontAtlasUrl],
  );

  return (
    <Demo
      metaData={{
        title: 'UI Buttons',
        description:
          'A demo showcasing createButton and keyboard/gamepad focus navigation from the ui module: click, hover, and arrow-key/Enter navigation between three buttons.',
      }}
      header="UI Buttons"
      blurb="Three buttons (createButton), each hoverable, clickable, and keyboard/gamepad-focus-navigable. Click one, or use the arrow keys to move focus between them and Enter/Space to activate the focused one - either path raises the same onInvoke, updating the status text above. Hovering a button also focuses it, so the highlight follows the mouse the same way it follows the keyboard, and each button's color eases between normal/hover/pressed tints via createUiTransitionEcsSystem."
      createGame={createGame}
      interactions={
        <>
          <InteractionInstruction
            displayElement={
              <div style={badgeStyle}>
                <i className="fa-solid fa-computer-mouse" />
              </div>
            }
            text="Click a button."
          />
          <InteractionInstruction
            displayElement={
              <>
                <KeyboardKey keyCode="↑" />
                <KeyboardKey keyCode="↓" />
              </>
            }
            text="Move focus between buttons."
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="⏎" />}
            text="Activate the focused button."
          />
        </>
      }
      codeFiles={[{ name: 'game.ts', content: gameCode }]}
    />
  );
}
