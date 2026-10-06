import React, { JSX } from 'react';
import { createSensorsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createSceneCode from '!!raw-loader!./_create-scene';
import ballSpawnerSystemCode from '!!raw-loader!./_ball-spawner.system';
import triggerZoneComponentCode from '!!raw-loader!./_trigger-zone.component';
import triggerZoneSystemCode from '!!raw-loader!./_trigger-zone.system';
import drainSystemCode from '!!raw-loader!./_drain.system';

import { Demo } from '@site/src/components/Demo';

export default function Sensors(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Sensors and Contacts Demo',
        description:
          'A demo showcasing sensor colliders and per-entity contacts.',
      }}
      header="Sensors and Contacts"
      blurb="Balls fall through a world of solid and sensor colliders. The grey walls and ramps are ordinary colliders that balls bounce off. The two colored bands are sensors: the narrow phase detects balls overlapping them but never resolves those overlaps, so balls fall straight through. Each band has a ContactsEcsComponent, and a small system reads it every tick, tinting a ball when it starts touching the band, resetting it when the contact ends, and brightening the band while anything is inside. A sensor drain below the bottom edge removes every ball it starts touching. The zones and the drain use a collision mask that only accepts balls, so they never report the walls they touch."
      createGame={createSensorsGame}
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'create-scene.ts', content: createSceneCode },
        {
          name: 'trigger-zone.component.ts',
          content: triggerZoneComponentCode,
        },
        { name: 'trigger-zone.system.ts', content: triggerZoneSystemCode },
        { name: 'drain.system.ts', content: drainSystemCode },
        { name: 'ball-spawner.system.ts', content: ballSpawnerSystemCode },
      ]}
    />
  );
}
