import React, { JSX } from 'react';
import { createParticlesGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createCursorEffectsCode from '!!raw-loader!./_create-cursor-effects';
import createEmberFountainCode from '!!raw-loader!./_create-ember-fountain';

import { DemoPage } from '@site/src/components/demo-page';

export default function Particles(): JSX.Element {
  return (
    <DemoPage
      slug="particles"
      createGame={createParticlesGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click' }],
          action: 'Burst sparks',
        },
        {
          inputs: [{ device: 'mouse', label: 'Hold and drag' }],
          action: 'Trail smoke',
        },
      ]}
      highlights={[
        {
          text: 'The ember fountain runs forever on a steady emissionRate, with drag slowing the embers as they rise and fade.',
          file: 'create-ember-fountain.ts',
        },
        {
          text: 'A click fires one burst of sparks outward from a ring, and gravity pulls them down as they fade.',
          file: 'create-cursor-effects.ts',
        },
        {
          text: 'The spark and smoke emitters are two named emitters on one entity, a pattern for running several effects from one object.',
          file: 'create-cursor-effects.ts',
        },
        {
          text: "Emitters spawn around their entity's world position, so moving the cursor entity moves the effects.",
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Particles', to: '/docs/docs/particles' },
        { label: 'Configuring emitters', to: '/docs/docs/particles/emitters' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Creates both effects, registers the particle systems and wires up mouse input.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Effects',
          files: [
            {
              name: 'create-ember-fountain.ts',
              summary: 'An emitter that streams embers upward on its own.',
              content: createEmberFountainCode,
            },
            {
              name: 'create-cursor-effects.ts',
              summary:
                'One entity with spark and smoke emitters, driven by the mouse.',
              content: createCursorEffectsCode,
            },
          ],
        },
      ]}
    />
  );
}
