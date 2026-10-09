import React, { JSX } from 'react';
import { createMovingPlatformGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createBoundariesCode from '!!raw-loader!./_create-boundaries';
import createPlatformCode from '!!raw-loader!./_create-platform';
import platformMoverComponentCode from '!!raw-loader!./_platform-mover.component';
import platformMoverSystemCode from '!!raw-loader!./_platform-mover.system';
import spawnCratesCode from '!!raw-loader!./_spawn-crates';

import { DemoPage } from '@site/src/components/demo-page';

export default function MovingPlatform(): JSX.Element {
  return (
    <DemoPage
      slug="moving-platform"
      createGame={createMovingPlatformGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click' }],
          action: 'Drop a crate',
        },
      ]}
      highlights={[
        {
          text: 'The platform is a kinematic body: game code sets its velocity, and gravity and collisions never change it.',
          file: 'create-platform.ts',
        },
        {
          text: 'A small demo system reverses the velocity at each end; euler integration moves it like any other body.',
          file: 'platform-mover.system.ts',
        },
        {
          text: 'The crates are dynamic bodies, so they ride along on the platform and get pushed as it sweeps under them.',
          file: 'spawn-crates.ts',
        },
        {
          text: 'A click converts the cursor to world space and drops a new crate there.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Bodies and shapes', to: '/docs/docs/physics/rigid-bodies' },
        { label: 'Collisions', to: '/docs/docs/physics/collisions' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up the scene and starting crates, registers the systems and handles clicks.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'The platform',
          files: [
            {
              name: 'create-platform.ts',
              summary:
                'Creates the kinematic platform with its collider and starting velocity.',
              content: createPlatformCode,
            },
            {
              name: 'platform-mover.component.ts',
              summary: 'The bounds and speed of a back-and-forth platform.',
              content: platformMoverComponentCode,
            },
            {
              name: 'platform-mover.system.ts',
              summary:
                "Reverses the platform's velocity when it reaches either bound.",
              content: platformMoverSystemCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'spawn-crates.ts',
              summary: 'Loads the crate sprite and spawns dynamic crates.',
              content: spawnCratesCode,
            },
            {
              name: 'create-boundaries.ts',
              summary:
                'Adds a static floor and walls that catch crates falling off the platform.',
              content: createBoundariesCode,
            },
          ],
        },
      ]}
    />
  );
}
