import React, { JSX } from 'react';
import { createTextInputGame } from './_create-game';
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

export default function UiTextInput(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'UI Text Input',
        description:
          'A demo showcasing createTextInput from the ui module: a name entry form with two text fields, character filters, and submit/cancel events.',
      }}
      header="UI Text Input"
      blurb="A name entry form built from two text fields (createTextInput) and a button. Click or tap a field to type into it; Enter submits the field and Escape cancels it. The pilot name can't start with a space and the badge number keeps only upper-cased letters and digits. Keys typed into a field don't move UI focus or press the focused button."
      createGame={createTextInputGame}
      interactions={
        <>
          <InteractionInstruction
            displayElement={
              <div style={badgeStyle}>
                <i className="fa-solid fa-computer-mouse" />
              </div>
            }
            text="Click a field to type into it."
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="⏎" />}
            text="Submit the field you're typing in."
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="Esc" />}
            text="Cancel typing."
          />
        </>
      }
      codeFiles={[{ name: 'game.ts', content: gameCode }]}
    />
  );
}
