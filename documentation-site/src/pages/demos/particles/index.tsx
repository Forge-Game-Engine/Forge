import React, { JSX } from 'react';
import { createParticlesGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createCursorEffectsCode from '!!raw-loader!./_create-cursor-effects';
import createEmberFountainCode from '!!raw-loader!./_create-ember-fountain';

import { Demo } from '@site/src/components/Demo';

export default function Particles(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Particles Demo',
        description:
          "A demo showcasing Forge's particle system using Kenney's particle pack.",
      }}
      header="Particles"
      blurb="This demo showcases the particle system using Kenney's particle pack. A fountain of embers at the bottom streams upward on its own at a steady emissionRate, slowing with drag as it rises and fading out. Click anywhere to burst a ring of sparks that fly outward from the cursor, slow down and fall under gravity, and hold and drag the mouse to trail smoke that rises, grows and fades. The spark and smoke emitters live on the same entity as two named emitters, the same pattern used for running several independent effects, like an attack and a footstep, off one entity, and every effect spawns around its entity's position."
      createGame={createParticlesGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-cursor-effects.ts',
          content: createCursorEffectsCode,
        },
        {
          name: 'create-ember-fountain.ts',
          content: createEmberFountainCode,
        },
      ]}
    />
  );
}
