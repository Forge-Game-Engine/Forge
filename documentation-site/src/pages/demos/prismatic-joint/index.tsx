import React, { JSX } from 'react';
import { createPrismaticJointGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createSlidersCode from '!!raw-loader!./_create-sliders';
import pumpComponentCode from '!!raw-loader!./_pump.component';
import pumpSystemCode from '!!raw-loader!./_pump.system';

import { Demo } from '@site/src/components/Demo';

export default function PrismaticJoint(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Prismatic Joint (Slider) Demo',
        description:
          "A demo showcasing the physics engine's PrismaticJoint: a constraint that locks two bodies to a single sliding axis.",
      }}
      header="Prismatic Joint (Slider)"
      blurb="This demo showcases PrismaticJoint in three different setups. On the left, a piston pumps back and forth along a level rail between two limits. In the middle, an elevator platform is pumped upward and falls back down under gravity to its lower limit. On the right, a ball is pumped back up a diagonal incline and rolls back down it under gravity. In every case the joint keeps the slider locked to its rail: no rotation, no drifting sideways off the line, only limited to translate along the axis. PrismaticJoint has no built-in motor, so each slider is driven by a small demo-only system that periodically applies an impulse (see pump.component.ts and pump.system.ts)."
      createGame={createPrismaticJointGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-sliders.ts',
          content: createSlidersCode,
        },
        {
          name: 'pump.component.ts',
          content: pumpComponentCode,
        },
        {
          name: 'pump.system.ts',
          content: pumpSystemCode,
        },
      ]}
    />
  );
}
