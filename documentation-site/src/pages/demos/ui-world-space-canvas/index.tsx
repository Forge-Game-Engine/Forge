import React, { JSX, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { createWorldSpaceCanvasGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';

import { Demo } from '@site/src/components/Demo';

export default function UiWorldSpaceCanvas(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const fontAtlasUrl = `${siteConfig.baseUrl}fonts/default/default.json`;
  const createGame = useCallback(
    () => createWorldSpaceCanvasGame(fontAtlasUrl),
    [fontAtlasUrl],
  );

  return (
    <Demo
      metaData={{
        title: 'UI World-Space Canvas',
        description:
          'A demo showcasing renderMode: worldSpace - a diegetic health bar placed above its target, either parented to it or kept upright with anchoredPosition.',
      }}
      header="UI World-Space Canvas"
      blurb="Two identical spinning 'enemies', each with a diegetic health-bar canvas (renderMode: 'worldSpace'). The left enemy's health bar is attached the ordinary way, with addParentComponent - it inherits the enemy's full world transform and visibly spins and swings around as the enemy rotates, exactly like any other parented entity. The right enemy's has no parent and is placed above it with its anchoredPosition instead, so it stays upright regardless of which way the enemy is facing - the behavior a health bar almost always wants. For a moving target, a system of your own writes anchoredPosition from the target's position every frame."
      createGame={createGame}
      codeFiles={[{ name: 'game.ts', content: gameCode }]}
    />
  );
}
