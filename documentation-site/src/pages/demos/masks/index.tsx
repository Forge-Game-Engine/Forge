import React, { JSX } from 'react';
import { createMasksGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import maskedContentCode from '!!raw-loader!./_create-masked-content';
import maskPulseComponentCode from '!!raw-loader!./_mask-pulse.component';
import maskPulseSystemCode from '!!raw-loader!./_mask-pulse.system';
import scrollComponentCode from '!!raw-loader!./_scroll.component';
import scrollSystemCode from '!!raw-loader!./_scroll.system';

import { Demo } from '@site/src/components/Demo';

export default function Masks(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Masks Demo',
        description:
          'A demo showcasing MaskEcsComponent: clipping a scrolling list to a rect, and revealing a bar and an arc gauge with linear and radial masks.',
      }}
      header="Masks"
      blurb="A MaskEcsComponent clips the sprites and text of its entity and its descendants. Left: a list scrolls through a rect mask. Top right: a nine-slice bar stays full size while a linear mask reveals it, so its rounded ends never squash. Bottom right: a radial mask over three quarters of a turn fills an arc gauge."
      createGame={createMasksGame}
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'create-masked-content.ts', content: maskedContentCode },
        { name: 'mask-pulse.component.ts', content: maskPulseComponentCode },
        { name: 'mask-pulse.system.ts', content: maskPulseSystemCode },
        { name: 'scroll.component.ts', content: scrollComponentCode },
        { name: 'scroll.system.ts', content: scrollSystemCode },
      ]}
    />
  );
}
