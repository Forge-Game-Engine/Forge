import React, { JSX } from 'react';
import { createStressTestGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createSpriteSpawnerCode from '!!raw-loader!./_create-sprite-spawner';
import spriteSpawnerComponentCode from '!!raw-loader!./_sprite-spawner.component';
import spriteSpawnerSystemCode from '!!raw-loader!./_sprite-spawner.system';
import fpsMonitorSystemCode from '!!raw-loader!./_fps-monitor.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function StressTest(): JSX.Element {
  return (
    <DemoPage
      slug="stress-test"
      createGame={createStressTestGame}
      highlights={[
        {
          text: 'Every tenth of a second, a spawner adds 100 more sprites at random positions.',
          file: 'sprite-spawner.system.ts',
        },
        {
          text: 'All the sprites share one texture, so the renderer can batch them into instanced draws.',
          file: 'create-sprite-spawner.ts',
        },
        {
          text: 'Open the browser console to see the sprite count when the frame rate first drops below 100, 60 and 30 FPS.',
          file: 'fps-monitor.system.ts',
        },
        {
          text: 'Spawning stops once the frame rate falls below 30 FPS.',
          file: 'fps-monitor.system.ts',
        },
      ]}
      docLinks={[
        { label: 'Sprites', to: '/docs/docs/rendering/sprites' },
        { label: 'Time', to: '/docs/docs/common/time' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Creates the spawner and registers the spawn, render and FPS systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Spawning sprites',
          files: [
            {
              name: 'create-sprite-spawner.ts',
              summary:
                'Loads the star sprite and creates the spawner across the camera view.',
              content: createSpriteSpawnerCode,
            },
            {
              name: 'sprite-spawner.component.ts',
              summary:
                'The batch size, timing, bounds and count of the spawner.',
              content: spriteSpawnerComponentCode,
            },
            {
              name: 'sprite-spawner.system.ts',
              summary:
                'Spawns a batch of sprites at random positions on a fixed interval.',
              content: spriteSpawnerSystemCode,
            },
          ],
        },
        {
          title: 'Measuring',
          files: [
            {
              name: 'fps-monitor.system.ts',
              summary:
                'Logs the sprite count at each FPS threshold and stops the spawner.',
              content: fpsMonitorSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
