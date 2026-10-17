import React, { JSX, useCallback, useRef, useState } from 'react';
import { createAnchorsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createAnchorPlaygroundCode from '!!raw-loader!./_create-anchor-playground';

import { DemoPage, DemoPanel } from '@site/src/components/demo-page';
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

export default function UiAnchors(): JSX.Element {
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
      createAnchorsGame((playground) => {
        playgroundRef.current = playground;
      }),
    [],
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
    <DemoPage
      slug="ui-anchors"
      createGame={createGame}
      panels={
        <DemoPanel title="Playground" icon="fa-sliders">
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
        </DemoPanel>
      }
      highlights={[
        {
          text: 'Each panel has an anchor that pins it to a corner or stretches it along an edge of the canvas.',
          file: 'create-game.ts',
        },
        {
          text: 'The orange panel takes its anchor, position and size straight from the playground controls, written into its live rect transform.',
          file: 'create-anchor-playground.ts',
        },
        {
          text: 'On a point axis the slider sets a fixed size; on a stretched axis it sets a margin from the anchored span.',
          file: 'create-anchor-playground.ts',
        },
        {
          text: 'Layout is resolved every frame, so in fullscreen every panel still sits where its anchor says, at any aspect ratio.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Anchors and layout', to: '/docs/docs/ui/anchors-and-layout' },
        { label: 'Responsive UI', to: '/docs/docs/ui/responsive-ui' },
        { label: 'Creating a canvas', to: '/docs/docs/ui/creating-a-canvas' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Builds the canvas, the five reference panels and the orange playground panel.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Playground',
          files: [
            {
              name: 'create-anchor-playground.ts',
              summary:
                "The anchor presets and functions that write the controls into the panel's rect transform.",
              content: createAnchorPlaygroundCode,
            },
          ],
        },
      ]}
    />
  );
}
