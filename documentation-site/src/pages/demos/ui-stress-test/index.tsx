import React, { JSX } from 'react';
import { createUiStressTestGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import spawnerComponentCode from '!!raw-loader!./_stress-test-spawner.component';
import spawnerSystemCode from '!!raw-loader!./_stress-test-spawner.system';
import fpsMonitorSystemCode from '!!raw-loader!./_fps-monitor.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function UiStressTest(): JSX.Element {
  return (
    <DemoPage
      slug="ui-stress-test"
      createGame={createUiStressTestGame}
      highlights={[
        {
          text: 'A spawner adds 50 small panels to a grid layout group every tenth of a second.',
          file: 'stress-test-spawner.system.ts',
        },
        {
          text: 'The UI layout systems recompute every element every frame, with no dirty tracking, so layouts can never go stale.',
          file: 'create-game.ts',
        },
        {
          text: 'Open the browser console to see how many panels were on screen when the frame rate dropped below 100, 60 and 30 FPS.',
          file: 'fps-monitor.system.ts',
        },
        {
          text: 'Spawning stops once the frame rate falls below 30 FPS.',
          file: 'fps-monitor.system.ts',
        },
      ]}
      docLinks={[
        { label: 'Layout groups', to: '/docs/docs/ui/layout-groups' },
        { label: 'Systems', to: '/docs/docs/ecs/system' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Builds the full-screen grid, the spawner and the counter label, and registers the systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Spawning and measuring',
          files: [
            {
              name: 'stress-test-spawner.component.ts',
              summary:
                'Holds the grid container, batch settings and how many panels were spawned.',
              content: spawnerComponentCode,
            },
            {
              name: 'stress-test-spawner.system.ts',
              summary:
                'Adds a batch of tinted panels to the grid at a fixed interval.',
              content: spawnerSystemCode,
            },
            {
              name: 'fps-monitor.system.ts',
              summary:
                'Logs the panel count at each FPS threshold and stops the spawner at the last.',
              content: fpsMonitorSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
