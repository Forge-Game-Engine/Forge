import React, { JSX } from 'react';
import { createNineSliceGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createPanelsCode from '!!raw-loader!./_create-panels';
import panelComponentCode from '!!raw-loader!./_panel.component';
import panelSystemCode from '!!raw-loader!./_panel.system';

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
  fontWeight: 700,
};

export default function NineSlice(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Nine-Slice Sprites',
        description:
          'A demo comparing a naively-stretched sprite against nine-sliced sprites with stretch and tile edge/center modes.',
      }}
      header="Nine-Slice Sprites"
      blurb="The same 64x64 panel artwork (a 12px border with gold corner accents around a tiled grid) drives all three panels, which all breathe between the same minimum and maximum size together. The left panel is a plain, unsliced sprite: as it grows, its border and corner accents stretch right along with it, turning soft and blurry. The middle panel is nine-sliced with the default 'stretch' mode: its corners stay a crisp, fixed size no matter how large the panel gets, while its edges and center stretch to fill the rest. The right panel uses 'tile' mode instead: its corners are just as fixed, but the edges and center repeat the grid pattern at its native size rather than stretching it, so the grid squares stay square."
      createGame={createNineSliceGame}
      interactions={
        <>
          <InteractionInstruction
            displayElement={<div style={badgeStyle}>1</div>}
            text="Naive stretch (no slicing)"
          />
          <InteractionInstruction
            displayElement={<div style={badgeStyle}>2</div>}
            text="Nine-slice: stretch"
          />
          <InteractionInstruction
            displayElement={<div style={badgeStyle}>3</div>}
            text="Nine-slice: tile"
          />
        </>
      }
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-panels.ts',
          content: createPanelsCode,
        },
        {
          name: 'panel.component.ts',
          content: panelComponentCode,
        },
        {
          name: 'panel.system.ts',
          content: panelSystemCode,
        },
      ]}
    />
  );
}
