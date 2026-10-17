import React, { JSX } from 'react';
import { createRevoluteJointGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createHingesCode from '!!raw-loader!./_create-hinges';
import pushComponentCode from '!!raw-loader!./_push.component';
import pushSystemCode from '!!raw-loader!./_push.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function RevoluteJoint(): JSX.Element {
  return (
    <DemoPage
      slug="revolute-joint"
      createGame={createRevoluteJointGame}
      highlights={[
        {
          text: 'A revolute joint pins two bodies together at a point: translation is locked, but rotation stays free.',
          file: 'create-hinges.ts',
        },
        {
          text: "The door's joint is limited to a 90 degree swing; gravity closes it and a periodic push opens it again.",
          file: 'create-hinges.ts',
        },
        {
          text: 'The pendulum has no limit and no push, and the wheel was spun once, so it keeps turning with nothing to resist it.',
          file: 'create-hinges.ts',
        },
        {
          text: 'Revolute joints have no motor, so the door is pushed by an impulse applied near its far edge.',
          file: 'push.system.ts',
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
                'Sets up the camera and hinges, and registers every system in the order they run.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-hinges.ts',
              summary:
                'Builds the door, pendulum and wheel, each hinged to a fixed pivot.',
              content: createHingesCode,
            },
          ],
        },
        {
          title: 'Pushing the door',
          files: [
            {
              name: 'push.component.ts',
              summary:
                'Settings for an impulse applied at a point on a body every so often.',
              content: pushComponentCode,
            },
            {
              name: 'push.system.ts',
              summary:
                'Applies each push at its contact point, rotated to follow the body.',
              content: pushSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
