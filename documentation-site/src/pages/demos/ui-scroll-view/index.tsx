import React, { JSX } from 'react';
import { createScrollViewGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { KeyboardKey } from '@site/src/components/_KeyboardKey';

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

export default function UiScrollView(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'UI Scroll View',
        description:
          'A demo showcasing createScrollView from the ui module: a clipped, scrolling list dragged with the pointer, turned with the mouse wheel, moved with a scrollbar and followed by keyboard focus, with inertia and elastic edges.',
      }}
      header="UI Scroll View"
      blurb="createScrollView clips a list of 30 buttons to its viewport with a mask. Drag the list - on a button or between them - and it follows the pointer, coasts after a quick release and springs back when pulled past an end. A drag that starts on a button scrolls instead of clicking it. The mouse wheel and the scrollbar scroll it too, and moving focus with the arrow keys scrolls the focused button into view."
      createGame={createScrollViewGame}
      interactions={
        <>
          <InteractionInstruction
            displayElement={
              <div style={badgeStyle}>
                <i className="fa-solid fa-computer-mouse" />
              </div>
            }
            text="Drag the list or its scrollbar, turn the wheel, or click a level."
          />
          <InteractionInstruction
            displayElement={
              <>
                <KeyboardKey keyCode="↑" />
                <KeyboardKey keyCode="↓" />
              </>
            }
            text="Move focus through the list; it scrolls to follow."
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="⏎" />}
            text="Pick the focused level."
          />
        </>
      }
      codeFiles={[{ name: 'game.ts', content: gameCode }]}
    />
  );
}
