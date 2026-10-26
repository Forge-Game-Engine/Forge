import React, { JSX } from 'react';
import { createSleepingGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createLevelCode from '!!raw-loader!./_create-level';
import createBodiesCode from '!!raw-loader!./_create-bodies';
import createInputsCode from '!!raw-loader!./_create-inputs';
import explosionComponentCode from '!!raw-loader!./_explosion.component';
import explosionSystemCode from '!!raw-loader!./_explosion.system';
import trapdoorSystemCode from '!!raw-loader!./_trapdoor.system';
import sleepTintSystemCode from '!!raw-loader!./_sleep-tint.system';
import createSleepReadoutCode from '!!raw-loader!./_create-sleep-readout';
import sleepReadoutComponentCode from '!!raw-loader!./_sleep-readout.component';
import sleepReadoutSystemCode from '!!raw-loader!./_sleep-readout.system';

import {
  DemoLegend,
  DemoPage,
  DemoPanel,
} from '@site/src/components/demo-page';

/** A legend marker: a square in the given color. */
const swatch = (color: string): JSX.Element => (
  <span style={{ width: 16, height: 16, backgroundColor: color }} />
);

export default function Sleeping(): JSX.Element {
  return (
    <DemoPage
      slug="sleeping"
      createGame={createSleepingGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click' }],
          action: 'Set off an explosion',
          detail: 'Wakes every island it pushes',
        },
        {
          inputs: ['Space'],
          action: 'Open the trapdoor',
          detail: 'Removes the orange shelf segment under the pyramid',
        },
      ]}
      panels={
        <DemoPanel title="Legend" icon="fa-list">
          <DemoLegend
            items={[
              { marker: swatch('rgb(60, 220, 120)'), label: 'Awake body' },
              { marker: swatch('rgb(21, 84, 60)'), label: 'Sleeping body' },
              {
                marker: swatch('rgb(70, 150, 230)'),
                label: 'Ball that can never sleep',
              },
            ]}
          />
        </DemoPanel>
      }
      highlights={[
        {
          text: 'The sleep system runs once per fixed step, after the narrow phase and before gravity. Bodies sleep in islands: the bodies connected by contacts or joints. Every body in an island must rest for half a second before the island falls asleep.',
          file: 'create-game.ts',
        },
        {
          text: 'The pyramid is one island through its contacts. The planks are one island through their revolute joints. The static shelf joins no island, so the two sleep and wake apart.',
          file: 'create-bodies.ts',
        },
        {
          text: "The sleep system's default resting speed assumes a world measured in meters. This world's units are pixels, so the demo scales it to match.",
          file: 'create-game.ts',
        },
        {
          text: 'A click calls applyExplosiveForce. The velocity it gives sleeping bodies wakes their islands. Opening the trapdoor removes a static body the pyramid rests on, which wakes it too.',
          file: 'trapdoor.system.ts',
        },
        {
          text: 'The ball has canSleep set to false, so it never sleeps. It touches nothing but the shelf, so it keeps no other body awake.',
          file: 'create-bodies.ts',
        },
        {
          text: 'The broad phase still pairs sleeping bodies whose bounds overlap. The narrow phase reuses the contacts a sleeping island recorded instead of testing them again, so its count drops once everything settles. Bodies that come to rest close together without touching are still tested.',
          file: 'sleep-readout.system.ts',
        },
      ]}
      docLinks={[
        { label: 'Sleeping bodies', to: '/docs/docs/physics/sleeping' },
        { label: 'Physics', to: '/docs/docs/physics' },
        { label: 'Joints', to: '/docs/docs/physics/joints' },
        { label: 'Forces', to: '/docs/docs/physics/forces' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Builds the scene and readout, and registers the physics and sleep systems in order.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-level.ts',
              summary:
                'Adds the static walls, basin floor and shelf, and tags the trapdoor segment.',
              content: createLevelCode,
            },
            {
              name: 'create-bodies.ts',
              summary:
                'Stacks the pyramid, drops the jointed planks and places the ball that never sleeps.',
              content: createBodiesCode,
            },
          ],
        },
        {
          title: 'Waking bodies',
          files: [
            {
              name: 'create-inputs.ts',
              summary: 'Binds a left click and Space to their actions.',
              content: createInputsCode,
            },
            {
              name: 'explosion.component.ts',
              summary: "The explosion's camera, force and radius.",
              content: explosionComponentCode,
            },
            {
              name: 'explosion.system.ts',
              summary: 'Calls applyExplosiveForce where the mouse is clicked.',
              content: explosionSystemCode,
            },
            {
              name: 'trapdoor.system.ts',
              summary: 'Removes the trapdoor when Space is pressed.',
              content: trapdoorSystemCode,
            },
          ],
        },
        {
          title: 'Showing sleep',
          files: [
            {
              name: 'sleep-tint.system.ts',
              summary: "Dims each body's sprite while it's asleep.",
              content: sleepTintSystemCode,
            },
            {
              name: 'create-sleep-readout.ts',
              summary: 'Creates the on-screen readout panel and its labels.',
              content: createSleepReadoutCode,
            },
            {
              name: 'sleep-readout.component.ts',
              summary: 'The label entities the readout writes to.',
              content: sleepReadoutComponentCode,
            },
            {
              name: 'sleep-readout.system.ts',
              summary:
                'Counts sleeping bodies, broad-phase pairs and the pairs the narrow phase tests.',
              content: sleepReadoutSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
