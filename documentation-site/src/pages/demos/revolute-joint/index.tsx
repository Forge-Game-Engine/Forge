import React, { JSX } from 'react';
import { createRevoluteJointGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createHingesCode from '!!raw-loader!./_create-hinges';
import pushComponentCode from '!!raw-loader!./_push.component';
import pushSystemCode from '!!raw-loader!./_push.system';

import { Demo } from '@site/src/components/Demo';

export default function RevoluteJoint(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Revolute Joint (Hinge) Demo',
        description:
          "A demo showcasing the physics engine's RevoluteJoint: a constraint that pins two bodies together at a point, locking translation but leaving rotation free.",
      }}
      header="Revolute Joint (Hinge)"
      blurb="This demo showcases RevoluteJoint in three different setups. On the left, a door is hinged to a wall mount, its swing limited to 90 degrees between closed and open; gravity swings it shut and a periodic push swings it back open. In the middle, a pendulum is hinged by an arm to a fixed pivot and, with no limit and no push at all, simply swings back and forth under gravity, rotation is completely free. On the right, a wheel is hinged directly to its hub and, having been given a single initial spin, keeps rotating indefinitely: unlike RevoluteJoint's translation lock, nothing resists rotation unless a limit is enabled. RevoluteJoint has no built-in motor, so the door's swing is driven by a small demo-only system that periodically applies an off-center impulse (see push.component.ts and push.system.ts)."
      createGame={createRevoluteJointGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-hinges.ts',
          content: createHingesCode,
        },
        {
          name: 'push.component.ts',
          content: pushComponentCode,
        },
        {
          name: 'push.system.ts',
          content: pushSystemCode,
        },
      ]}
    />
  );
}
