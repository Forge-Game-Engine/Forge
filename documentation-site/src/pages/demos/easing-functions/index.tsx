import React, { JSX } from 'react';
import { createEasingFunctionsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createEasingRowsCode from '!!raw-loader!./_create-easing-rows';
import easingRowComponentCode from '!!raw-loader!./_easing-row.component';
import easingRowSystemCode from '!!raw-loader!./_easing-row.system';

import {
  DemoLegend,
  DemoPage,
  DemoPanel,
} from '@site/src/components/demo-page';
import { easingRowConfigs } from './_create-easing-rows';

export default function EasingFunctions(): JSX.Element {
  return (
    <DemoPage
      slug="easing-functions"
      createGame={createEasingFunctionsGame}
      panels={
        <DemoPanel title="Legend" icon="fa-list">
          <DemoLegend
            items={easingRowConfigs.map(({ name, color }) => ({
              marker: (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: color.toRGBAString(),
                  }}
                />
              ),
              label: name,
            }))}
          />
        </DemoPanel>
      }
      highlights={[
        {
          text: 'Each lane sweeps a ball back and forth with a different easing function, so the curves can be compared side by side.',
          file: 'create-easing-rows.ts',
        },
        {
          text: 'A system turns time into a 0 to 1 ping-pong phase, eases it, and moves the ball between the lane ends by that amount.',
          file: 'easing-row.system.ts',
        },
        {
          text: 'easeInBack, easeInOutBack and easeInOutElastic return values outside 0 to 1, so their balls briefly overshoot the lane.',
          file: 'create-easing-rows.ts',
        },
      ]}
      docLinks={[
        {
          label: 'Property animations',
          to: '/docs/docs/animations/property-animations',
        },
        {
          label: 'Interpolation and smoothing',
          to: '/docs/docs/math/interpolation-and-smoothing',
        },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary: 'Builds the easing lanes and registers the systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-easing-rows.ts',
              summary:
                'Lists the easing functions and builds a lane and ball for each.',
              content: createEasingRowsCode,
            },
          ],
        },
        {
          title: 'Easing',
          files: [
            {
              name: 'easing-row.component.ts',
              summary: "A ball's easing function and the range it sweeps.",
              content: easingRowComponentCode,
            },
            {
              name: 'easing-row.system.ts',
              summary:
                'Moves each ball along its lane using its easing function.',
              content: easingRowSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
