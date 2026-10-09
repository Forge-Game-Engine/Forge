import React, { JSX } from 'react';
import { createTextInputGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';

import { DemoPage } from '@site/src/components/demo-page';

export default function UiTextInput(): JSX.Element {
  return (
    <DemoPage
      slug="ui-text-input"
      createGame={createTextInputGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click a field' }],
          action: 'Start typing',
        },
        { inputs: ['↑', '↓', '←', '→'], action: 'Move focus' },
        {
          inputs: ['Enter'],
          action: 'Submit',
          detail: 'Outside a field: press the focused field or button',
        },
        { inputs: ['Esc'], action: 'Cancel typing' },
      ]}
      highlights={[
        {
          text: 'createTextInput builds each field, with a placeholder, a caret and a maximum length.',
          file: 'create-game.ts',
        },
        {
          text: "Filters shape what's typed: the pilot name can't start with a space, and the badge keeps only upper-cased letters and digits.",
          file: 'create-game.ts',
        },
        {
          text: "Enter fires the field's onSubmit event and Escape fires onCancel, which update the status line.",
          file: 'create-game.ts',
        },
        {
          text: "Keys typed into a field don't reach the UI's bindings, so they never move focus or press the focused button.",
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Text input', to: '/docs/docs/ui/text-input' },
        {
          label: 'Buttons and interaction',
          to: '/docs/docs/ui/buttons-and-interaction',
        },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Builds the two filtered text fields, the log-in button and the status line.',
              content: gameCode,
            },
          ],
        },
      ]}
    />
  );
}
