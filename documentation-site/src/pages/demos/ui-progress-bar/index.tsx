import React, { JSX } from 'react';
import { createProgressBarGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import pulseComponentCode from '!!raw-loader!./_pulse.component';
import pulseSystemCode from '!!raw-loader!./_pulse.system';

import { Demo } from '@site/src/components/Demo';

export default function UiProgressBar(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'UI Progress Bar',
        description:
          'A demo showcasing createProgressBar from the ui module: read-only linear and radial fill indicators driven purely by value.',
      }}
      header="UI Progress Bar"
      blurb="createProgressBar builds a read-only fill indicator - no UiInteractableEcsComponent, since a progress bar reports state rather than accepting input. Its fill keeps its full size and a mask reveals the part the value covers: a linear mask for the health bar, a radial one (fillShape) for the cooldown ring. This demo's own _pulse.system.ts (not part of the ui module) oscillates both values on a timer to show them moving without needing any player interaction; createUiProgressBarEcsSystem picks up those writes the same frame they're made, unlike a slider, which has no such guarantee."
      createGame={createProgressBarGame}
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'pulse.component.ts', content: pulseComponentCode },
        { name: 'pulse.system.ts', content: pulseSystemCode },
      ]}
    />
  );
}
