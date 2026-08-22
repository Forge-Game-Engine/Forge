import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createAnchorsGame } from './_create-game';
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

export default function UiAnchors(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;
  const createGame = useCallback(
    () => createAnchorsGame(fontAtlasUrl),
    [fontAtlasUrl],
  );

  return (
    <Demo
      metaData={{
        title: 'UI Anchors',
        description:
          'A demo showcasing RectTransformEcsComponent anchors and pivots from the ui module: corner-pinned, edge-stretched, and centered panels.',
      }}
      header="UI Anchors"
      blurb="Six panels, each placed with a different UiAnchor preset - a full-width top bar (stretchTop) and five point anchors (topLeft, topRight, bottomLeft, bottomRight, center). Every panel's RectTransformEcsComponent resolves fresh every frame from the canvas's current aspect ratio, so toggling fullscreen keeps each one exactly where its own anchor says it should be, at any window shape - no manual reflow code required."
      createGame={createGame}
      interactions={
        <InteractionInstruction
          displayElement={
            <div style={badgeStyle}>
              <i className="fa-solid fa-expand" />
            </div>
          }
          text="Toggle fullscreen to see every panel hold its anchor at a different aspect ratio."
        />
      }
      codeFiles={[{ name: 'game.ts', content: gameCode }]}
    />
  );
}
