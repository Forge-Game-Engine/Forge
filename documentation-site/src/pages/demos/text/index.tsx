import React, { JSX } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createTextGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createEffectsExamplesCode from '!!raw-loader!./_create-effects-examples';
import createGuideBoxCode from '!!raw-loader!./_create-guide-box';
import createHorizontalAlignmentExamplesCode from '!!raw-loader!./_create-horizontal-alignment-examples';
import createVerticalAlignmentExamplesCode from '!!raw-loader!./_create-vertical-alignment-examples';
import createLineHeightExamplesCode from '!!raw-loader!./_create-line-height-examples';
import createLiveMaxWidthExampleCode from '!!raw-loader!./_create-live-max-width-example';
import liveMaxWidthComponentCode from '!!raw-loader!./_live-max-width.component';
import liveMaxWidthSystemCode from '!!raw-loader!./_live-max-width.system';
import pulsingTextEffectComponentCode from '!!raw-loader!./_pulsing-text-effect.component';
import pulsingTextEffectSystemCode from '!!raw-loader!./_pulsing-text-effect.system';

import { Demo } from '@site/src/components/Demo';

export default function Text(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/text-demo/liberation-sans.json`;

  return (
    <Demo
      metaData={{
        title: 'Text Rendering Demo',
        description:
          'A demo showcasing MSDF text rendering, multi-line layout, alignment, outline/shadow effects, and live reflow with addTextComponent and createTextShapingEcsSystem.',
      }}
      header="Text Rendering"
      blurb="A showcase of multi-line layout and text effects (Liberation Sans, SIL OFL 1.1): every horizontalAlign value (left/center/right/justify) wrapping the same sentence, every verticalAlign value (top/middle/bottom) positioned against a shared anchor line, a few lineHeight multipliers compared side by side, a pulsing outline and a pulsing soft-shadow (glow) effect on the same word, and - at the bottom - a paragraph whose maxWidth oscillates every frame, driving createTextShapingEcsSystem to reflow it live. Every guide box/line is sized from shapeText's own computed bounds, not guessed."
      createGame={() => createTextGame(fontAtlasUrl)}
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
          name: 'create-effects-examples.ts',
          content: createEffectsExamplesCode,
        },
        {
          name: 'pulsing-text-effect.component.ts',
          content: pulsingTextEffectComponentCode,
        },
        {
          name: 'pulsing-text-effect.system.ts',
          content: pulsingTextEffectSystemCode,
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
      ]}
    />
  );
}
