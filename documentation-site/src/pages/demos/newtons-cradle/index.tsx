import React, { JSX } from 'react';
import { createNewtonsCradleGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createCradleCode from '!!raw-loader!./_create-cradle';

import { Demo } from '@site/src/components/Demo';

export default function NewtonsCradle(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: "Newton's Cradle Demo",
        description:
          "A demo showcasing the physics engine's RevoluteJoint and collision resolution together: five balls hinged to a shared frame, transferring momentum through each other exactly like the executive desk toy.",
      }}
      header="Newton's Cradle"
      blurb="Five balls are each hinged to their own pivot on a shared frame by a RevoluteJoint, spaced so neighboring balls just touch at rest, exactly like the desk toy. The joints only keep each ball swinging about its own pivot, they play no part in transferring momentum between balls, that comes entirely from the engine's ordinary collision resolution between the balls themselves. The leftmost ball starts pulled back and is released exactly once, when the scene is built, swings in, and the impact carries down the row to pop the rightmost ball out. From there it's left alone, so it settles the same way a real cradle does after a single push."
      createGame={createNewtonsCradleGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-cradle.ts',
          content: createCradleCode,
        },
      ]}
    />
  );
}
