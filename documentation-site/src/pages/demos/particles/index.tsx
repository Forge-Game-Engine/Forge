import React, { JSX } from 'react';
import { createParticlesGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createCursorEffectsCode from '!!raw-loader!./_create-cursor-effects';
import createEmberFountainCode from '!!raw-loader!./_create-ember-fountain';
import ambientEmitterComponentCode from '!!raw-loader!./_ambient-emitter.component';
import ambientEmitterSystemCode from '!!raw-loader!./_ambient-emitter.system';

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
      blurb="This demo showcases the particle system using Kenney's particle pack. A fountain of embers at the bottom continuously emits and drifts upward on its own, click anywhere to burst a shower of sparks, and hold and drag the mouse to paint a trail of smoke. The fountain and the spark burst both use a one-off burst (emitDurationSeconds of 0), while the smoke trail spreads its particles out continuously for as long as the mouse is held, and grows instead of shrinking as it fades. The spark and smoke emitters live on the same entity as two named emitters, the same pattern used for running several independent effects, like an attack and a footstep, off one entity."
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
        {
          name: 'ambient-emitter.component.ts',
          content: ambientEmitterComponentCode,
        },
        {
          name: 'ambient-emitter.system.ts',
          content: ambientEmitterSystemCode,
        },
      ]}
    />
  );
}
