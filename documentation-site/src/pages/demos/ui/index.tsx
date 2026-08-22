import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createUiDemoGame } from './_create-game';
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

export default function Ui(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;
  const createGame = useCallback(
    () => createUiDemoGame(fontAtlasUrl),
    [fontAtlasUrl],
  );

  return (
    <Demo
      metaData={{
        title: 'UI',
        description:
          'A HUD built with the ui module: a full-width top bar, a corner-anchored score panel, and a hoverable, clickable, keyboard/gamepad-focus-navigable Play button, layered over a game world through a dedicated UI camera.',
      }}
      header="UI"
      blurb="A dedicated, static UI camera (createUiCanvas) composites a HUD over the tinted 'game world' backdrop drawn by an ordinary world camera - the two are isolated from each other by culling mask, so the HUD is never drawn twice and never shows up in the world. The top bar and score panel resolve their layout fresh every frame from the canvas's current aspect ratio, so toggling fullscreen keeps both exactly where they should be. The Play button (createButton) is fully interactive: click it, or focus-navigate to it with the arrow keys and press Enter/Space - either path raises the same onInvoke, which increments the click counter below it. Its color eases between normal/hover/pressed tints via createUiTransitionEcsSystem, and hovering it also focuses it, so the highlight follows the mouse the same way it follows the keyboard."
      createGame={createGame}
      interactions={
        <>
          <InteractionInstruction
            displayElement={
              <div style={badgeStyle}>
                <i className="fa-solid fa-computer-mouse" />
              </div>
            }
            text="Click the Play button."
          />
          <InteractionInstruction
            displayElement={
              <>
                <KeyboardKey keyCode="↑" />
                <KeyboardKey keyCode="↓" />
                <KeyboardKey keyCode="←" />
                <KeyboardKey keyCode="→" />
              </>
            }
            text="Move focus to the Play button."
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="⏎" />}
            text="Activate the focused button."
          />
          <InteractionInstruction
            displayElement={
              <div style={badgeStyle}>
                <i className="fa-solid fa-expand" />
              </div>
            }
            text="Toggle fullscreen to see the HUD hold its layout at a different aspect ratio."
          />
        </>
      }
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
      ]}
    />
  );
}
