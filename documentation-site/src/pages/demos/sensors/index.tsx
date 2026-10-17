import React, { JSX } from 'react';
import { createSensorsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createSceneCode from '!!raw-loader!./_create-scene';
import ballSpawnerSystemCode from '!!raw-loader!./_ball-spawner.system';
import triggerZoneComponentCode from '!!raw-loader!./_trigger-zone.component';
import triggerZoneSystemCode from '!!raw-loader!./_trigger-zone.system';
import drainSystemCode from '!!raw-loader!./_drain.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function Sensors(): JSX.Element {
  return (
    <DemoPage
      slug="sensors"
      createGame={createSensorsGame}
      highlights={[
        {
          text: 'The grey walls and ramps are ordinary colliders, so the falling balls bounce off them.',
          file: 'create-scene.ts',
        },
        {
          text: 'The colored bands are sensors: the narrow phase detects overlaps but never resolves them, so balls fall straight through.',
          file: 'create-scene.ts',
        },
        {
          text: 'Each band reads its contacts every tick, tinting a ball when it enters, resetting it when it leaves, and brightening while occupied.',
          file: 'trigger-zone.system.ts',
        },
        {
          text: 'A sensor drain below the bottom edge removes every ball that starts touching it.',
          file: 'drain.system.ts',
        },
        {
          text: 'The bands and drain use a collision mask that only accepts balls, so they never report the walls they touch.',
          file: 'create-scene.ts',
        },
      ]}
      docLinks={[{ label: 'Collisions', to: '/docs/docs/physics/collisions' }]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up the camera and scene, and registers every system in the order they run.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-scene.ts',
              summary:
                'Creates the solid walls and ramps, the two sensor bands and the drain.',
              content: createSceneCode,
            },
            {
              name: 'ball-spawner.system.ts',
              summary:
                'Drops a new ball from above the scene every fifth of a second.',
              content: ballSpawnerSystemCode,
            },
          ],
        },
        {
          title: 'Sensors',
          files: [
            {
              name: 'trigger-zone.component.ts',
              summary: 'The tint a sensor band gives balls inside it.',
              content: triggerZoneComponentCode,
            },
            {
              name: 'trigger-zone.system.ts',
              summary:
                "Reads each band's contacts to tint balls and brighten the band.",
              content: triggerZoneSystemCode,
            },
            {
              name: 'drain.system.ts',
              summary:
                'Removes every ball that starts touching the drain sensor.',
              content: drainSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
