import React, { JSX } from 'react';
import { createStressTestGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createSpriteSpawnerCode from '!!raw-loader!./_create-sprite-spawner';
import spriteSpawnerComponentCode from '!!raw-loader!./_sprite-spawner.component';
import spriteSpawnerSystemCode from '!!raw-loader!./_sprite-spawner.system';
import fpsMonitorSystemCode from '!!raw-loader!./_fps-monitor.system';

import { Demo } from '@site/src/components/Demo';

export default function StressTest(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Stress Test Demo',
        description:
          'A demo that stress tests the rendering pipeline by spawning sprites until the frame rate drops.',
      }}
      header="Stress Test"
      blurb="This demo spawns batches of sprites at a regular interval, growing the sprite count over time. Open the browser console to see how many sprites had been spawned when the frame rate first dropped below 100, 60 and 30 FPS. Spawning stops once the frame rate drops below 30."
      createGame={createStressTestGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-sprite-spawner.ts',
          content: createSpriteSpawnerCode,
        },
        {
          name: 'sprite-spawner.component.ts',
          content: spriteSpawnerComponentCode,
        },
        {
          name: 'sprite-spawner.system.ts',
          content: spriteSpawnerSystemCode,
        },
        {
          name: 'fps-monitor.system.ts',
          content: fpsMonitorSystemCode,
        },
      ]}
    />
  );
}
