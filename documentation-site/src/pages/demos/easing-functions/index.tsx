import React, { JSX } from 'react';
import { createEasingFunctionsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createEasingRowsCode from '!!raw-loader!./_create-easing-rows';
import easingRowComponentCode from '!!raw-loader!./_easing-row.component';
import easingRowSystemCode from '!!raw-loader!./_easing-row.system';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { easingRowConfigs } from './_create-easing-rows';

export default function EasingFunctions(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Easing Functions',
        description:
          'A demo showcasing all of the easing functions in the animations module.',
      }}
      header="Easing Functions"
      blurb="Each lane sweeps a ball back and forth using one of the easing functions from the animations module, so their curves can be compared side by side. Watch how easeInBack, easeInOutBack and easeInOutElastic momentarily overshoot the lane before settling."
      createGame={createEasingFunctionsGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-easing-rows.ts',
          content: createEasingRowsCode,
        },
        {
          name: 'easing-row.component.ts',
          content: easingRowComponentCode,
        },
        {
          name: 'easing-row.system.ts',
          content: easingRowSystemCode,
        },
      ]}
      interactions={
        <>
          {easingRowConfigs.map(({ name, color }) => (
            <InteractionInstruction
              key={name}
              displayElement={
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: color.toRGBAString(),
                  }}
                />
              }
              text={name}
            />
          ))}
        </>
      }
    />
  );
}
