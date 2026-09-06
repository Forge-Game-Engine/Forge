import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createSliderGame } from './_create-game';
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

export default function UiSlider(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;
  const createGame = useCallback(
    () => createSliderGame(fontAtlasUrl),
    [fontAtlasUrl],
  );

  return (
    <Demo
      metaData={{
        title: 'UI Slider',
        description:
          'A demo showcasing createSlider from the ui module: a click-and-drag track with a handle and fill, driving a live value label.',
      }}
      header="UI Slider"
      blurb="createSlider builds a track with a draggable handle and a fill sprite that tracks the current value. The whole track is the drag surface - clicking anywhere on it, not just the handle, jumps the handle there - and dragging keeps tracking even if the pointer strays outside the track's vertical bounds. The value label updates live via onValueChanged."
      createGame={createGame}
      interactions={
        <InteractionInstruction
          displayElement={
            <div style={badgeStyle}>
              <i className="fa-solid fa-computer-mouse" />
            </div>
          }
          text="Drag the handle, or click anywhere on the track."
        />
      }
      codeFiles={[{ name: 'game.ts', content: gameCode }]}
    />
  );
}
