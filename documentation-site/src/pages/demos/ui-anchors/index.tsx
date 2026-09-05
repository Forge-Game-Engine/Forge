import React, { JSX, useCallback, useRef, useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createAnchorsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createAnchorPlaygroundCode from '!!raw-loader!./_create-anchor-playground';
import playgroundControlsCode from '!!raw-loader!./_PlaygroundControls';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import {
  AnchorPlayground,
  anchorPlaygroundDefaults,
  AnchorPlaygroundPresetName,
  getAnchorStretchAxes,
  setAnchorPlaygroundPosition,
  setAnchorPlaygroundPreset,
  setAnchorPlaygroundSizeOrMargin,
} from './_create-anchor-playground';
import { PlaygroundControls } from './_PlaygroundControls';

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

  const playgroundRef = useRef<AnchorPlayground | null>(null);
  const [presetName, setPresetName] = useState<AnchorPlaygroundPresetName>(
    anchorPlaygroundDefaults.presetName,
  );
  const [anchoredPositionX, setAnchoredPositionX] = useState(
    anchorPlaygroundDefaults.anchoredPositionX,
  );
  const [anchoredPositionY, setAnchoredPositionY] = useState(
    anchorPlaygroundDefaults.anchoredPositionY,
  );
  const [sizeOrMarginX, setSizeOrMarginX] = useState(
    anchorPlaygroundDefaults.sizeOrMarginX,
  );
  const [sizeOrMarginY, setSizeOrMarginY] = useState(
    anchorPlaygroundDefaults.sizeOrMarginY,
  );

  const createGame = useCallback(
    () =>
      createAnchorsGame(fontAtlasUrl, (playground) => {
        playgroundRef.current = playground;
      }),
    [fontAtlasUrl],
  );

  const handlePresetNameChange = (value: AnchorPlaygroundPresetName) => {
    setPresetName(value);

    if (playgroundRef.current) {
      setAnchorPlaygroundPreset(playgroundRef.current, value);
    }
  };

  const handleAnchoredPositionXChange = (value: number) => {
    setAnchoredPositionX(value);

    if (playgroundRef.current) {
      setAnchorPlaygroundPosition(
        playgroundRef.current,
        value,
        anchoredPositionY,
      );
    }
  };

  const handleAnchoredPositionYChange = (value: number) => {
    setAnchoredPositionY(value);

    if (playgroundRef.current) {
      setAnchorPlaygroundPosition(
        playgroundRef.current,
        anchoredPositionX,
        value,
      );
    }
  };

  const handleSizeOrMarginXChange = (value: number) => {
    setSizeOrMarginX(value);

    if (playgroundRef.current) {
      setAnchorPlaygroundSizeOrMargin(
        playgroundRef.current,
        value,
        sizeOrMarginY,
      );
    }
  };

  const handleSizeOrMarginYChange = (value: number) => {
    setSizeOrMarginY(value);

    if (playgroundRef.current) {
      setAnchorPlaygroundSizeOrMargin(
        playgroundRef.current,
        sizeOrMarginX,
        value,
      );
    }
  };

  const { isStretchX, isStretchY } = getAnchorStretchAxes(presetName);

  return (
    <Demo
      metaData={{
        title: 'UI Anchors',
        description:
          'A demo showcasing RectTransformEcsComponent anchors and pivots from the ui module: corner-pinned, edge-stretched, and centered panels, plus a live-controllable anchor playground.',
      }}
      header="UI Anchors"
      blurb="Four corner-pinned reference panels (topLeft, topRight, bottomLeft, bottomRight) and a full-width top bar (stretchTop), plus one orange playground panel you can drive yourself with the controls above: pick any UiAnchor preset, then drag its position and size/margin sliders to see exactly how anchorMin/anchorMax/pivot/anchoredPosition/sizeOrMargin interact. Every panel's RectTransformEcsComponent resolves fresh every frame from the canvas's current aspect ratio, so toggling fullscreen keeps each one exactly where its own anchor says it should be, at any window shape - no manual reflow code required."
      createGame={createGame}
      interactions={
        <>
          <PlaygroundControls
            presetName={presetName}
            anchoredPositionX={anchoredPositionX}
            anchoredPositionY={anchoredPositionY}
            minAnchoredPosition={anchorPlaygroundDefaults.minAnchoredPosition}
            maxAnchoredPosition={anchorPlaygroundDefaults.maxAnchoredPosition}
            sizeOrMarginX={sizeOrMarginX}
            sizeOrMarginY={sizeOrMarginY}
            minSizeOrMargin={anchorPlaygroundDefaults.minSizeOrMargin}
            maxSizeOrMargin={anchorPlaygroundDefaults.maxSizeOrMargin}
            isStretchX={isStretchX}
            isStretchY={isStretchY}
            onPresetNameChange={handlePresetNameChange}
            onAnchoredPositionXChange={handleAnchoredPositionXChange}
            onAnchoredPositionYChange={handleAnchoredPositionYChange}
            onSizeOrMarginXChange={handleSizeOrMarginXChange}
            onSizeOrMarginYChange={handleSizeOrMarginYChange}
          />
          <InteractionInstruction
            displayElement={
              <div style={badgeStyle}>
                <i className="fa-solid fa-expand" />
              </div>
            }
            text="Toggle fullscreen to see the orange playground panel (and every reference panel) hold its anchor at a different aspect ratio."
          />
        </>
      }
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        {
          name: 'create-anchor-playground.ts',
          content: createAnchorPlaygroundCode,
        },
        {
          name: 'PlaygroundControls.tsx',
          content: playgroundControlsCode,
        },
      ]}
    />
  );
}
