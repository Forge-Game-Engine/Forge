import React, { JSX } from 'react';
import { createContextLossGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createPlanetCode from '!!raw-loader!./_create-planet';
import loseContextOnClickCode from '!!raw-loader!./_lose-context-on-click';
import spinSystemCode from '!!raw-loader!./_spin.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function ContextLoss(): JSX.Element {
  return (
    <DemoPage
      slug="context-loss"
      createGame={createContextLossGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click the planet' }],
          action: 'Lose the WebGL context',
          detail: 'It comes back after 1.5 seconds',
        },
      ]}
      highlights={[
        {
          text: 'A click makes the browser take the WebGL context away, the way a GPU reset would, and gives it back a moment later.',
          file: 'lose-context-on-click.ts',
        },
        {
          text: 'Nothing is drawn while the context is gone, but the game keeps running, so the planet has kept spinning when it returns.',
          file: 'spin.system.ts',
        },
        {
          text: 'On restore, the engine rebuilds its textures, programs and buffers from data it kept, like the image the planet texture was loaded from.',
          file: 'create-planet.ts',
        },
        {
          text: 'The onContextLost listener lowers the maximum pixel ratio, so the game comes back at a lower resolution.',
          file: 'lose-context-on-click.ts',
        },
      ]}
      docLinks={[
        { label: 'Context loss', to: '/docs/docs/rendering/context-loss' },
        { label: 'Textures', to: '/docs/docs/rendering/textures' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Creates the camera and planet, sets up the click handler and registers the systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Scene',
          files: [
            {
              name: 'lose-context-on-click.ts',
              summary:
                'Loses and restores the context on click, and lowers the pixel ratio when it is lost.',
              content: loseContextOnClickCode,
            },
            {
              name: 'create-planet.ts',
              summary: 'Creates the spinning planet sprite.',
              content: createPlanetCode,
            },
            {
              name: 'spin.system.ts',
              summary:
                'A spin component and the system that turns entities at a steady rate.',
              content: spinSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
