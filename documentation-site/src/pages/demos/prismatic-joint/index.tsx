import React, { JSX } from 'react';
import { createPrismaticJointGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createSlidersCode from '!!raw-loader!./_create-sliders';
import pumpComponentCode from '!!raw-loader!./_pump.component';
import pumpSystemCode from '!!raw-loader!./_pump.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function PrismaticJoint(): JSX.Element {
  return (
    <DemoPage
      slug="prismatic-joint"
      createGame={createPrismaticJointGame}
      highlights={[
        {
          text: 'Each slider is joined to a static anchor by a prismatic joint, so it can only move along one axis, never rotate or drift sideways.',
          file: 'create-sliders.ts',
        },
        {
          text: 'Joint limits stop each slider at the ends of its dotted rail: a level piston, a vertical elevator and a diagonal incline.',
          file: 'create-sliders.ts',
        },
        {
          text: 'Prismatic joints have no motor, so a small demo system applies an impulse every few seconds; gravity brings the elevator and ball back.',
          file: 'pump.system.ts',
        },
        {
          text: 'The joint solver runs after collision resolution, so the rail constraint has the last word on velocity each tick.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
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
                'Sets up the camera and sliders, and registers every system in the order they run.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-sliders.ts',
              summary:
                'Builds the piston, elevator and incline: anchors, rails, sliders and their joints.',
              content: createSlidersCode,
            },
          ],
        },
        {
          title: 'Pumping',
          files: [
            {
              name: 'pump.component.ts',
              summary:
                'Settings for periodically nudging a slider along its rail.',
              content: pumpComponentCode,
            },
            {
              name: 'pump.system.ts',
              summary:
                'Applies each pump impulse on its interval, flipping direction for the piston.',
              content: pumpSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
