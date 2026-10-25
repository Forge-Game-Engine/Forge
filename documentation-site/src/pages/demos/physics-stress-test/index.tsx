import React, { JSX } from 'react';
import { createPhysicsStressTestGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createBoundariesCode from '!!raw-loader!./_create-boundaries';
import createBodySpawnerCode from '!!raw-loader!./_create-body-spawner';
import bodySpawnerComponentCode from '!!raw-loader!./_body-spawner.component';
import bodySpawnerSystemCode from '!!raw-loader!./_body-spawner.system';
import createFpsMonitorCode from '!!raw-loader!./_create-fps-monitor';
import fpsMonitorComponentCode from '!!raw-loader!./_fps-monitor.component';
import fpsMonitorSystemCode from '!!raw-loader!./_fps-monitor.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function PhysicsStressTest(): JSX.Element {
  return (
    <DemoPage
      slug="physics-stress-test"
      createGame={createPhysicsStressTestGame}
      highlights={[
        {
          text: 'Every tenth of a second, a spawner drops 10 more dynamic circles and boxes onto a terrain floor between two walls.',
          file: 'body-spawner.system.ts',
        },
        {
          text: 'Every physics system is registered in the order the physics guide lists, including springs, dampers, joints and motors that no body here uses.',
          file: 'create-game.ts',
        },
        {
          text: 'The readout (and the browser console) shows the body count when the frame rate first falls below 100, 60 and 30 FPS. Spawning stops after 30.',
          file: 'fps-monitor.system.ts',
        },
        {
          text: "The monitor first measures the display's frame rate with an empty scene, and skips any threshold the display can't rise above.",
          file: 'fps-monitor.system.ts',
        },
        {
          text: "The counts depend on the machine and display. To compare changes to collision detection, run the engine's collision benchmark (npm run bench), which times the same pipeline over fixed scenes.",
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Physics', to: '/docs/docs/physics' },
        { label: 'Collisions', to: '/docs/docs/physics/collisions' },
        { label: 'Terrain', to: '/docs/docs/physics/terrain' },
        { label: 'Time', to: '/docs/docs/common/time' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Creates the scene, spawner and readout, and registers the full physics pipeline.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Scene',
          files: [
            {
              name: 'create-boundaries.ts',
              summary:
                'Builds the wavy terrain floor and the static walls the bodies pile up between.',
              content: createBoundariesCode,
            },
          ],
        },
        {
          title: 'Spawning bodies',
          files: [
            {
              name: 'create-body-spawner.ts',
              summary:
                'Loads the body sprites and creates the spawner above the arena.',
              content: createBodySpawnerCode,
            },
            {
              name: 'body-spawner.component.ts',
              summary:
                'The batch size, timing, sizes, bounds and count of the spawner.',
              content: bodySpawnerComponentCode,
            },
            {
              name: 'body-spawner.system.ts',
              summary:
                'Drops a batch of alternating circles and boxes on a fixed interval.',
              content: bodySpawnerSystemCode,
            },
          ],
        },
        {
          title: 'Measuring',
          files: [
            {
              name: 'create-fps-monitor.ts',
              summary:
                'Creates the on-screen readout and attaches the monitor to the spawner.',
              content: createFpsMonitorCode,
            },
            {
              name: 'fps-monitor.component.ts',
              summary:
                'The display frame rate, each threshold reading and the readout labels.',
              content: fpsMonitorComponentCode,
            },
            {
              name: 'fps-monitor.system.ts',
              summary:
                'Records the body count at each FPS threshold and starts and stops the spawner.',
              content: fpsMonitorSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
