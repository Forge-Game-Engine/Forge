import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createProgressBarGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import pulseComponentCode from '!!raw-loader!./_pulse.component';
import pulseSystemCode from '!!raw-loader!./_pulse.system';

import { Demo } from '@site/src/components/Demo';

export default function UiProgressBar(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;
  const createGame = useCallback(
    () => createProgressBarGame(fontAtlasUrl),
    [fontAtlasUrl],
  );

  return (
    <Demo
      metaData={{
        title: 'UI Progress Bar',
        description:
          'A demo showcasing createProgressBar from the ui module: a read-only linear fill indicator driven purely by value.',
      }}
      header="UI Progress Bar"
      blurb="createProgressBar builds a read-only linear fill indicator - no UiInteractableEcsComponent, since a progress bar reports state rather than accepting input. This demo's own _pulse.system.ts (not part of the ui module) oscillates the health bar's value on a timer to show it moving without needing any player interaction; createUiProgressBarEcsSystem picks up that write the same frame it's made, unlike a slider, which has no such guarantee."
      createGame={createGame}
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'pulse.component.ts', content: pulseComponentCode },
        { name: 'pulse.system.ts', content: pulseSystemCode },
      ]}
    />
  );
}
