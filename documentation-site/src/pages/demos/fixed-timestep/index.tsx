import React, { JSX, useCallback, useRef, useState } from 'react';
import { createFixedTimestepGame, FixedTimestepDemo } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createRowCode from '!!raw-loader!./_create-row';
import controlsCode from '!!raw-loader!./_controls';
import stepCounterComponentCode from '!!raw-loader!./_fixed-step-counter.component';
import stepCounterSystemCode from '!!raw-loader!./_fixed-step-counter.system';

import { DemoPage, DemoPanel } from '@site/src/components/demo-page';
import { defaultStepRate, setStepRate, StepRate } from './_controls';
import { FixedTimestepControls } from './_FixedTimestepControls';

export default function FixedTimestep(): JSX.Element {
  const demoRef = useRef<FixedTimestepDemo | null>(null);
  const stepRateRef = useRef<StepRate>(defaultStepRate);
  const [stepRate, setStepRateState] = useState<StepRate>(defaultStepRate);

  // A restarted game starts with a new `Time`, so the chosen rate is applied
  // to every game the page creates.
  const createGame = useCallback(
    () =>
      createFixedTimestepGame((demo) => {
        demoRef.current = demo;
        setStepRate(demo.time, stepRateRef.current);
      }),
    [],
  );

  const handleStepRateChange = (next: StepRate): void => {
    stepRateRef.current = next;
    setStepRateState(next);

    if (demoRef.current) {
      setStepRate(demoRef.current.time, next);
    }
  };

  return (
    <DemoPage
      slug="fixed-timestep"
      createGame={createGame}
      panels={
        <DemoPanel title="Fixed timestep" icon="fa-sliders">
          <FixedTimestepControls
            demoRef={demoRef}
            stepRate={stepRate}
            onStepRateChange={handleStepRateChange}
          />
        </DemoPanel>
      }
      highlights={[
        {
          text: 'Both rows run the same simulation in the fixed-update group, at the rate the panel sets on the Time.',
          file: 'create-game.ts',
        },
        {
          text: 'The bottom row has its bodies’ transform interpolation component removed, so it moves only on frames that run a fixed step. Pick 10 or 30 Hz to see it.',
          file: 'create-row.ts',
        },
        {
          text: 'The top row is drawn between its last two fixed steps by the overstep fraction, so it moves on every frame at any step rate.',
          file: 'create-game.ts',
        },
        {
          text: 'A hitch makes the next frame run several fixed steps to catch up, so the simulation keeps real time instead of slowing down.',
          file: 'controls.ts',
        },
        {
          text: 'A system in the fixed-update group counts how many steps each frame runs.',
          file: 'fixed-step-counter.system.ts',
        },
      ]}
      docLinks={[
        { label: 'Fixed timestep', to: '/docs/docs/physics/fixed-timestep' },
        { label: 'Time', to: '/docs/docs/common/time' },
        { label: 'Transforms', to: '/docs/docs/common/transforms' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Builds both rows and registers the fixed-update and once-per-frame systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-row.ts',
              summary:
                'Builds a row’s pendulum and bouncing ball, and removes their interpolation in the bottom row.',
              content: createRowCode,
            },
          ],
        },
        {
          title: 'Controls',
          files: [
            {
              name: 'controls.ts',
              summary:
                'Sets the fixed step rate on the Time, and blocks the main thread to simulate a hitch.',
              content: controlsCode,
            },
            {
              name: 'fixed-step-counter.component.ts',
              summary:
                'Holds how many fixed steps the latest frame ran, for the readout.',
              content: stepCounterComponentCode,
            },
            {
              name: 'fixed-step-counter.system.ts',
              summary:
                'Counts each fixed step, starting again from zero on the first step of a frame.',
              content: stepCounterSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
