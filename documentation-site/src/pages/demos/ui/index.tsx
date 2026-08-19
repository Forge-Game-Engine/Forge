import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createUiDemoGame } from './_create-game';
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
          'A HUD built with the ui module: a full-width top bar and a corner-anchored score panel, layered over a game world through a dedicated UI camera.',
      }}
      header="UI"
      blurb="A dedicated, static UI camera (createUiCanvas) composites a HUD over the tinted 'game world' backdrop drawn by an ordinary world camera - the two are isolated from each other by culling mask, so the HUD is never drawn twice and never shows up in the world. The top bar (anchored to the top edge, stretched across the full width) and the score panel (anchored to the top-left corner) both resolve their layout fresh every frame from the canvas's current aspect ratio, so toggling fullscreen - which changes the canvas's actual pixel size - keeps both exactly where they should be instead of drifting or stretching. This is the module's layout core only: the HUD is presentational, with no buttons or hover state yet."
      createGame={createGame}
      interactions={
        <InteractionInstruction
          displayElement={
            <div style={badgeStyle}>
              <i className="fa-solid fa-expand" />
            </div>
          }
          text="Toggle fullscreen to see the HUD hold its layout at a different aspect ratio."
        />
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
