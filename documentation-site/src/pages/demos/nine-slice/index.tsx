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
      blurb="The same 96x96 panel artwork (a flat white fill with a thin inset frame line and cross-shaped corner notches, from Kenney's Fantasy UI Borders pack) drives all three panels, which all breathe between the same minimum and maximum size together. The left panel is a plain, unsliced sprite: as it grows, its corner notches and frame line stretch right along with it, smearing out of shape. The middle and right panels are nine-sliced with 'stretch' and 'tile' edge/center modes respectively: both keep their corner notches a crisp, fixed size no matter how large the panel gets. Because this artwork's edges and center are a flat, untextured fill rather than a repeating pattern, 'stretch' and 'tile' render identically here - the difference between those two modes only becomes visible with source art that has repeating detail (a brick or wood-grain edge, for example) for tiling to preserve."
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
            text="Nine-slice: tile (looks identical to #2 with this flat-fill artwork)"
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
