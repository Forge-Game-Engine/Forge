import React, { JSX } from 'react';
import { createMovingPlatformGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createBoundariesCode from '!!raw-loader!./_create-boundaries';
import createPlatformCode from '!!raw-loader!./_create-platform';
import platformMoverComponentCode from '!!raw-loader!./_platform-mover.component';
import platformMoverSystemCode from '!!raw-loader!./_platform-mover.system';
import spawnCratesCode from '!!raw-loader!./_spawn-crates';

import { Demo } from '@site/src/components/Demo';

export default function MovingPlatform(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Moving Platform Demo',
        description:
          "A demo showcasing RigidBodyEcsComponent's kinematic body type: a platform driven directly by game code that carries and pushes dynamic crates without being affected by gravity or collisions itself.",
      }}
      header="Moving Platform"
      blurb="The platform is a kinematic body (type: 'kinematic'): a small demo-only system (see platform-mover.component.ts and platform-mover.system.ts) sets its velocity directly and reverses it at either end, and createEulerIntegrationEcsSystem moves it every tick from that velocity, exactly like a dynamic body. But unlike a dynamic body, gravity and collisions never change the platform's own velocity - only the crates react, getting carried along and pushed as the platform sweeps under them. Click anywhere to drop another crate."
      createGame={createMovingPlatformGame}
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'create-platform.ts', content: createPlatformCode },
        {
          name: 'platform-mover.component.ts',
          content: platformMoverComponentCode,
        },
        {
          name: 'platform-mover.system.ts',
          content: platformMoverSystemCode,
        },
        { name: 'spawn-crates.ts', content: spawnCratesCode },
        { name: 'create-boundaries.ts', content: createBoundariesCode },
      ]}
    />
  );
}
