import React, { JSX } from 'react';
import { createWreckingBallGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createWreckingBallCode from '!!raw-loader!./_create-wrecking-ball';

import { Demo } from '@site/src/components/Demo';

export default function WreckingBall(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Wrecking Ball Demo',
        description:
          "A demo showcasing the physics engine's RevoluteJoint and collision resolution together: a ball hinged to a crane, swung into a wall of bricks.",
      }}
      header="Wrecking Ball"
      blurb="A ball is hinged to a crane by a long arm, pulled back to one side, and released exactly once, when the scene is built, swinging into a wall of bricks. The joint only keeps the ball swinging about the crane's pivot; knocking the wall down comes entirely from the engine's ordinary collision resolution between the ball and the bricks, the same combination of joint and collisions used in the Newton's Cradle demo. After the first swing it's left alone rather than re-launched, so it settles the way a real wrecking ball would after a single push."
      createGame={createWreckingBallGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-wrecking-ball.ts',
          content: createWreckingBallCode,
        },
      ]}
    />
  );
}
