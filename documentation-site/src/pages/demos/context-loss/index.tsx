import React, { JSX } from 'react';
import { createContextLossGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createPlanetCode from '!!raw-loader!./_create-planet';
import loseContextOnClickCode from '!!raw-loader!./_lose-context-on-click';
import spinSystemCode from '!!raw-loader!./_spin.system';

import { Demo } from '@site/src/components/Demo';

export default function ContextLoss(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Context Loss',
        description:
          'A demo showing the engine surviving a lost WebGL context.',
      }}
      header="Context Loss"
      blurb="Click the planet to make the browser take the WebGL context away, the way a GPU reset would. Nothing is drawn while it's gone, but the game keeps running: when the context comes back a moment later, the engine rebuilds its textures, programs and buffers, and the planet has kept spinning. It comes back at a lower pixel ratio, chosen in the onContextLost listener."
      createGame={createContextLossGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'lose-context-on-click.ts',
          content: loseContextOnClickCode,
        },
        {
          name: 'create-planet.ts',
          content: createPlanetCode,
        },
        {
          name: 'spin.system.ts',
          content: spinSystemCode,
        },
      ]}
    />
  );
}
