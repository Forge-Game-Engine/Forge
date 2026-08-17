import React, { JSX, useCallback, useRef, useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createTextGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createGuideBoxCode from '!!raw-loader!./_create-guide-box';
import createHorizontalAlignmentExamplesCode from '!!raw-loader!./_create-horizontal-alignment-examples';
import createVerticalAlignmentExamplesCode from '!!raw-loader!./_create-vertical-alignment-examples';
import createLineHeightExamplesCode from '!!raw-loader!./_create-line-height-examples';
import createLiveMaxWidthExampleCode from '!!raw-loader!./_create-live-max-width-example';
import liveMaxWidthComponentCode from '!!raw-loader!./_live-max-width.component';
import liveMaxWidthSystemCode from '!!raw-loader!./_live-max-width.system';
import createEffectsExamplesCode from '!!raw-loader!./_create-effects-examples';
import createPlaygroundCode from '!!raw-loader!./_create-playground';
import playgroundControlsCode from '!!raw-loader!./_PlaygroundControls';

import { Demo } from '@site/src/components/Demo';
import {
  Playground,
  playgroundDefaults,
  PlaygroundHorizontalAlign,
  setPlaygroundGlow,
  setPlaygroundOutline,
  setPlaygroundWrap,
} from './_create-playground';
import { PlaygroundControls } from './_PlaygroundControls';

export default function Text(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;

  const playgroundRef = useRef<Playground | null>(null);
  const [text, setText] = useState(playgroundDefaults.text);
  const [size, setSize] = useState(playgroundDefaults.size);
  const [horizontalAlign, setHorizontalAlign] =
    useState<PlaygroundHorizontalAlign>(playgroundDefaults.horizontalAlign);
  const [wrapEnabled, setWrapEnabled] = useState(
    playgroundDefaults.wrapEnabled,
  );

  const [outlineEnabled, setOutlineEnabled] = useState(
    playgroundDefaults.outlineEnabled,
  );
  const [outlineColorHex, setOutlineColorHex] = useState(
    playgroundDefaults.outlineColorHex,
  );
  const [outlineWidth, setOutlineWidth] = useState(
    playgroundDefaults.outlineWidth,
  );

  const [glowEnabled, setGlowEnabled] = useState(
    playgroundDefaults.glowEnabled,
  );
  const [glowColorHex, setGlowColorHex] = useState(
    playgroundDefaults.glowColorHex,
  );
  const [glowOffsetX, setGlowOffsetX] = useState(
    playgroundDefaults.glowOffsetX,
  );
  const [glowOffsetY, setGlowOffsetY] = useState(
    playgroundDefaults.glowOffsetY,
  );
  const [glowSoftness, setGlowSoftness] = useState(
    playgroundDefaults.glowSoftness,
  );

  const createGame = useCallback(
    () =>
      createTextGame(fontAtlasUrl, (playground) => {
        playgroundRef.current = playground;
      }),
    [fontAtlasUrl],
  );

  const handleTextChange = (value: string) => {
    setText(value);

    if (playgroundRef.current) {
      playgroundRef.current.textComponent.text = value;
    }
  };

  const handleSizeChange = (value: number) => {
    setSize(value);

    if (playgroundRef.current) {
      playgroundRef.current.textComponent.size = value;
    }
  };

  const handleHorizontalAlignChange = (value: PlaygroundHorizontalAlign) => {
    setHorizontalAlign(value);

    if (playgroundRef.current) {
      playgroundRef.current.textComponent.horizontalAlign = value;
    }
  };

  const handleWrapEnabledChange = (value: boolean) => {
    setWrapEnabled(value);

    if (playgroundRef.current) {
      setPlaygroundWrap(
        playgroundRef.current.textComponent,
        playgroundRef.current.wrapWidth,
        value,
      );
    }
  };

  const applyOutline = (
    enabled: boolean,
    colorHex: string,
    width: number,
  ) => {
    if (playgroundRef.current) {
      setPlaygroundOutline(
        playgroundRef.current.textComponent,
        enabled,
        colorHex,
        width,
      );
    }
  };

  const handleOutlineEnabledChange = (value: boolean) => {
    setOutlineEnabled(value);
    applyOutline(value, outlineColorHex, outlineWidth);
  };

  const handleOutlineColorChange = (value: string) => {
    setOutlineColorHex(value);
    applyOutline(outlineEnabled, value, outlineWidth);
  };

  const handleOutlineWidthChange = (value: number) => {
    setOutlineWidth(value);
    applyOutline(outlineEnabled, outlineColorHex, value);
  };

  const applyGlow = (
    enabled: boolean,
    colorHex: string,
    offsetX: number,
    offsetY: number,
    softness: number,
  ) => {
    if (playgroundRef.current) {
      setPlaygroundGlow(
        playgroundRef.current.textComponent,
        enabled,
        colorHex,
        { x: offsetX, y: offsetY },
        softness,
      );
    }
  };

  const handleGlowEnabledChange = (value: boolean) => {
    setGlowEnabled(value);
    applyGlow(value, glowColorHex, glowOffsetX, glowOffsetY, glowSoftness);
  };

  const handleGlowColorChange = (value: string) => {
    setGlowColorHex(value);
    applyGlow(glowEnabled, value, glowOffsetX, glowOffsetY, glowSoftness);
  };

  const handleGlowOffsetXChange = (value: number) => {
    setGlowOffsetX(value);
    applyGlow(glowEnabled, glowColorHex, value, glowOffsetY, glowSoftness);
  };

  const handleGlowOffsetYChange = (value: number) => {
    setGlowOffsetY(value);
    applyGlow(glowEnabled, glowColorHex, glowOffsetX, value, glowSoftness);
  };

  const handleGlowSoftnessChange = (value: number) => {
    setGlowSoftness(value);
    applyGlow(glowEnabled, glowColorHex, glowOffsetX, glowOffsetY, value);
  };

  return (
    <Demo
      metaData={{
        title: 'Text Rendering Demo',
        description:
          'A demo showcasing MSDF text rendering, multi-line layout, alignment, live reflow, an interactive playground, and outline/soft-shadow effects with addTextComponent and createTextShapingEcsSystem.',
      }}
      header="Text Rendering"
      blurb="A showcase of MSDF text rendering using the engine's shipped default font atlas (Liberation Sans, SIL OFL 1.1 - zero font setup required): every horizontalAlign value (left/center/right/justify) wrapping the same sentence, every verticalAlign value (top/middle/bottom) positioned against a shared anchor line, a few lineHeight multipliers compared side by side, a paragraph whose maxWidth oscillates every frame (driving createTextShapingEcsSystem to reflow it live), an interactive playground you can type into using the controls above, and - at the bottom - outline/soft-shadow effects at a conservative, documented-safe size (see the Text Effects guide for why). Every guide box/line is sized from shapeText's own computed bounds, not guessed."
      createGame={createGame}
      interactions={
        <PlaygroundControls
          text={text}
          size={size}
          minSize={playgroundDefaults.minSize}
          maxSize={playgroundDefaults.maxSize}
          horizontalAlign={horizontalAlign}
          wrapEnabled={wrapEnabled}
          outlineEnabled={outlineEnabled}
          outlineColorHex={outlineColorHex}
          outlineWidth={outlineWidth}
          minOutlineWidth={playgroundDefaults.minOutlineWidth}
          maxOutlineWidth={playgroundDefaults.maxOutlineWidth}
          glowEnabled={glowEnabled}
          glowColorHex={glowColorHex}
          glowOffsetX={glowOffsetX}
          glowOffsetY={glowOffsetY}
          minGlowOffset={playgroundDefaults.minGlowOffset}
          maxGlowOffset={playgroundDefaults.maxGlowOffset}
          glowSoftness={glowSoftness}
          minGlowSoftness={playgroundDefaults.minGlowSoftness}
          maxGlowSoftness={playgroundDefaults.maxGlowSoftness}
          onTextChange={handleTextChange}
          onSizeChange={handleSizeChange}
          onHorizontalAlignChange={handleHorizontalAlignChange}
          onWrapEnabledChange={handleWrapEnabledChange}
          onOutlineEnabledChange={handleOutlineEnabledChange}
          onOutlineColorChange={handleOutlineColorChange}
          onOutlineWidthChange={handleOutlineWidthChange}
          onGlowEnabledChange={handleGlowEnabledChange}
          onGlowColorChange={handleGlowColorChange}
          onGlowOffsetXChange={handleGlowOffsetXChange}
          onGlowOffsetYChange={handleGlowOffsetYChange}
          onGlowSoftnessChange={handleGlowSoftnessChange}
        />
      }
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        {
          name: 'create-guide-box.ts',
          content: createGuideBoxCode,
        },
        {
          name: 'create-horizontal-alignment-examples.ts',
          content: createHorizontalAlignmentExamplesCode,
        },
        {
          name: 'create-vertical-alignment-examples.ts',
          content: createVerticalAlignmentExamplesCode,
        },
        {
          name: 'create-line-height-examples.ts',
          content: createLineHeightExamplesCode,
        },
        {
          name: 'create-live-max-width-example.ts',
          content: createLiveMaxWidthExampleCode,
        },
        {
          name: 'live-max-width.component.ts',
          content: liveMaxWidthComponentCode,
        },
        {
          name: 'live-max-width.system.ts',
          content: liveMaxWidthSystemCode,
        },
        {
          name: 'create-playground.ts',
          content: createPlaygroundCode,
        },
        {
          name: 'PlaygroundControls.tsx',
          content: playgroundControlsCode,
        },
        {
          name: 'create-effects-examples.ts',
          content: createEffectsExamplesCode,
        },
      ]}
    />
  );
}
