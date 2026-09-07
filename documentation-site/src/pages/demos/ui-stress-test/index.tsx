import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createUiStressTestGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import spawnerComponentCode from '!!raw-loader!./_stress-test-spawner.component';
import spawnerSystemCode from '!!raw-loader!./_stress-test-spawner.system';
import fpsMonitorSystemCode from '!!raw-loader!./_fps-monitor.system';

import { Demo } from '@site/src/components/Demo';

export default function UiStressTest(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;
  const createGame = useCallback(
    () => createUiStressTestGame(fontAtlasUrl),
    [fontAtlasUrl],
  );

  return (
    <Demo
      metaData={{
        title: 'UI Stress Test Demo',
        description:
          'A demo that stress tests the UI layout system by spawning grid-arranged UI panels until the frame rate drops.',
      }}
      header="UI Stress Test"
      blurb="This demo spawns batches of small UI panels into a grid layout group at a regular interval, growing the on-screen UI element count over time. Open the browser console to see how many panels had been spawned when the frame rate first dropped below 100, 60, and 30 FPS. Spawning stops once the frame rate drops below 30. createUiLayoutEcsSystem/createUiLayoutGroupEcsSystem resolve every element fresh every frame with no dirty tracking (DL-12) - this demo is that design's own stress test."
      createGame={createGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'stress-test-spawner.component.ts',
          content: spawnerComponentCode,
        },
        {
          name: 'stress-test-spawner.system.ts',
          content: spawnerSystemCode,
        },
        {
          name: 'fps-monitor.system.ts',
          content: fpsMonitorSystemCode,
        },
      ]}
    />
  );
}
