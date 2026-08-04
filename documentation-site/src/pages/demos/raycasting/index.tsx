import React, { JSX } from 'react';
import { createRaycastingGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createTargetsCode from '!!raw-loader!./_create-targets';
import rayVisualCode from '!!raw-loader!./_ray-visual';

import { Demo } from '@site/src/components/Demo';

export default function Raycasting(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Raycasting Demo',
        description: "A demo showcasing the physics engine's raycast function.",
      }}
      header="Raycasting"
      blurb="This demo showcases the physics engine's `raycast` function. A ray is cast from the fixed point on the left edge toward your mouse cursor every time it moves, against a handful of static circle and square colliders. Where the ray hits something, a marker appears at the exact intersection point and the ray turns red; otherwise it just extends toward the cursor."
      createGame={createRaycastingGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-targets.ts',
          content: createTargetsCode,
        },
        {
          name: 'ray-visual.ts',
          content: rayVisualCode,
        },
      ]}
    />
  );
}
