import React, { JSX, useCallback, useRef, useState } from 'react';
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
import createEffectsHeroExampleCode from '!!raw-loader!./_create-effects-hero-example';
import createRichTextExampleCode from '!!raw-loader!./_create-rich-text-example';
import createPlaygroundCode from '!!raw-loader!./_create-playground';
import playgroundControlsCode from '!!raw-loader!./_PlaygroundControls';

import { DemoPage, DemoPanel } from '@site/src/components/demo-page';
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
  const [outlineWidth, setOutlineWidth] = useState(
    playgroundDefaults.outlineWidth,
  );

  const [glowEnabled, setGlowEnabled] = useState(
    playgroundDefaults.glowEnabled,
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
      createTextGame((playground) => {
        playgroundRef.current = playground;
      }),
    [],
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

  const applyOutline = (enabled: boolean, width: number) => {
    if (playgroundRef.current) {
      setPlaygroundOutline(playgroundRef.current.textComponent, enabled, width);
    }
  };

  const handleOutlineEnabledChange = (value: boolean) => {
    setOutlineEnabled(value);
    applyOutline(value, outlineWidth);
  };

  const handleOutlineWidthChange = (value: number) => {
    setOutlineWidth(value);
    applyOutline(outlineEnabled, value);
  };

  const applyGlow = (
    enabled: boolean,
    offsetX: number,
    offsetY: number,
    softness: number,
  ) => {
    if (playgroundRef.current) {
      setPlaygroundGlow(
        playgroundRef.current.textComponent,
        enabled,
        { x: offsetX, y: offsetY },
        softness,
      );
    }
  };

  const handleGlowEnabledChange = (value: boolean) => {
    setGlowEnabled(value);
    applyGlow(value, glowOffsetX, glowOffsetY, glowSoftness);
  };

  const handleGlowOffsetXChange = (value: number) => {
    setGlowOffsetX(value);
    applyGlow(glowEnabled, value, glowOffsetY, glowSoftness);
  };

  const handleGlowOffsetYChange = (value: number) => {
    setGlowOffsetY(value);
    applyGlow(glowEnabled, glowOffsetX, value, glowSoftness);
  };

  const handleGlowSoftnessChange = (value: number) => {
    setGlowSoftness(value);
    applyGlow(glowEnabled, glowOffsetX, glowOffsetY, value);
  };

  return (
    <DemoPage
      slug="text"
      createGame={createGame}
      panels={
        <DemoPanel title="Playground" icon="fa-sliders">
          <PlaygroundControls
            text={text}
            size={size}
            minSize={playgroundDefaults.minSize}
            maxSize={playgroundDefaults.maxSize}
            horizontalAlign={horizontalAlign}
            wrapEnabled={wrapEnabled}
            outlineEnabled={outlineEnabled}
            outlineWidth={outlineWidth}
            minOutlineWidth={playgroundDefaults.minOutlineWidth}
            maxOutlineWidth={playgroundDefaults.maxOutlineWidth}
            glowEnabled={glowEnabled}
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
            onOutlineWidthChange={handleOutlineWidthChange}
            onGlowEnabledChange={handleGlowEnabledChange}
            onGlowOffsetXChange={handleGlowOffsetXChange}
            onGlowOffsetYChange={handleGlowOffsetYChange}
            onGlowSoftnessChange={handleGlowSoftnessChange}
          />
        </DemoPanel>
      }
      highlights={[
        {
          text: "All the text uses the engine's built-in MSDF font atlas, so it stays sharp at any size with no font setup.",
          file: 'create-game.ts',
        },
        {
          text: 'Every horizontal and vertical alignment lays out the same text, framed by guide boxes sized from shapeText bounds.',
          file: 'create-horizontal-alignment-examples.ts',
        },
        {
          text: "A system changes one paragraph's maxWidth every frame, and the text shaping system rewraps it live.",
          file: 'live-max-width.system.ts',
        },
        {
          text: '<b> and <color> tags style part of a string without changing how it wraps.',
          file: 'create-rich-text-example.ts',
        },
        {
          text: 'The playground controls write straight into a live text component, including its outline and glow.',
          file: 'create-playground.ts',
        },
      ]}
      docLinks={[
        { label: 'Rendering text', to: '/docs/docs/text/rendering-text' },
        { label: 'Text effects', to: '/docs/docs/text/text-effects' },
        {
          label: 'Loading a font atlas',
          to: '/docs/docs/text/loading-a-font-atlas',
        },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Loads the default font, stacks every example section and registers the systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Layout examples',
          files: [
            {
              name: 'create-guide-box.ts',
              summary: 'Draws the dark box that frames a block of text.',
              content: createGuideBoxCode,
            },
            {
              name: 'create-horizontal-alignment-examples.ts',
              summary:
                'Wraps one sentence with each horizontalAlign value side by side.',
              content: createHorizontalAlignmentExamplesCode,
            },
            {
              name: 'create-vertical-alignment-examples.ts',
              summary:
                'Places text against an anchor line with each verticalAlign value.',
              content: createVerticalAlignmentExamplesCode,
            },
            {
              name: 'create-line-height-examples.ts',
              summary:
                'Compares one paragraph at three lineHeight multipliers.',
              content: createLineHeightExamplesCode,
            },
          ],
        },
        {
          title: 'Live reflow',
          files: [
            {
              name: 'create-live-max-width-example.ts',
              summary:
                'Builds the paragraph, guide box and caption whose width changes live.',
              content: createLiveMaxWidthExampleCode,
            },
            {
              name: 'live-max-width.component.ts',
              summary:
                'Stores the width range, timing and guide box of the live paragraph.',
              content: liveMaxWidthComponentCode,
            },
            {
              name: 'live-max-width.system.ts',
              summary:
                "Swings the paragraph's maxWidth on a sine wave and updates its guide box.",
              content: liveMaxWidthSystemCode,
            },
          ],
        },
        {
          title: 'Rich text and effects',
          files: [
            {
              name: 'create-rich-text-example.ts',
              summary:
                'Styles a paragraph with <b> and <color> tags, and outlines bold text.',
              content: createRichTextExampleCode,
            },
            {
              name: 'create-effects-examples.ts',
              summary:
                'Compares plain text with an outline and a soft shadow at small, safe sizes.',
              content: createEffectsExamplesCode,
            },
            {
              name: 'create-effects-hero-example.ts',
              summary:
                'Draws one large word with a thick outline and a soft glow.',
              content: createEffectsHeroExampleCode,
            },
          ],
        },
        {
          title: 'Playground',
          files: [
            {
              name: 'create-playground.ts',
              summary:
                'Creates the editable text and helpers for its wrap, outline and glow.',
              content: createPlaygroundCode,
            },
            {
              name: 'PlaygroundControls.tsx',
              summary:
                'The React inputs that edit the playground text while the game runs.',
              content: playgroundControlsCode,
            },
          ],
        },
      ]}
    />
  );
}
