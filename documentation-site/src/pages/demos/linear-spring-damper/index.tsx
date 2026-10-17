import React, { JSX } from 'react';
import { createLinearSpringDamperGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createSuspensionsCode from '!!raw-loader!./_create-suspensions';
import resetComponentCode from '!!raw-loader!./_reset.component';
import resetSystemCode from '!!raw-loader!./_reset.system';
import springLineComponentCode from '!!raw-loader!./_spring-line.component';
import springLineSystemCode from '!!raw-loader!./_spring-line.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function LinearSpringDamper(): JSX.Element {
  return (
    <DemoPage
      slug="linear-spring-damper"
      createGame={createLinearSpringDamperGame}
      highlights={[
        {
          text: 'Each wheel hangs below a fixed mount on a linear spring, like a suspension on a vehicle frame.',
          file: 'create-suspensions.ts',
        },
        {
          text: 'The left wheel has only a spring, so nothing removes its energy and it keeps bouncing.',
          file: 'create-suspensions.ts',
        },
        {
          text: 'The right wheel adds a linear damper, which resists the speed of the bounce and settles it quickly, like a shock absorber.',
          file: 'create-suspensions.ts',
        },
        {
          text: 'Every few seconds both wheels are put back with the same upward velocity, replaying an identical bump.',
          file: 'reset.system.ts',
        },
        {
          text: "The bar between mount and wheel stretches each tick to show the spring's current length.",
          file: 'spring-line.system.ts',
        },
      ]}
      docLinks={[
        {
          label: 'Forces',
          to: '/docs/docs/physics/forces',
        },
        { label: 'Bodies and shapes', to: '/docs/docs/physics/rigid-bodies' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up the camera and suspensions, and registers every system in the order they run.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-suspensions.ts',
              summary:
                'Builds the two mounts and wheels, connected by a spring with or without a damper.',
              content: createSuspensionsCode,
            },
          ],
        },
        {
          title: 'Replaying the bump',
          files: [
            {
              name: 'reset.component.ts',
              summary:
                'The position and velocity a wheel returns to, and how often.',
              content: resetComponentCode,
            },
            {
              name: 'reset.system.ts',
              summary:
                'Teleports each wheel back to its start on a fixed interval.',
              content: resetSystemCode,
            },
          ],
        },
        {
          title: 'Drawing the spring',
          files: [
            {
              name: 'spring-line.component.ts',
              summary:
                'Links a line sprite to a fixed anchor and a moving body.',
              content: springLineComponentCode,
            },
            {
              name: 'spring-line.system.ts',
              summary:
                'Stretches each line sprite between its anchor and the body every tick.',
              content: springLineSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
