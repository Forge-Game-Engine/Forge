import React, { JSX } from 'react';
import { createGameStatesGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import demoStateCode from '!!raw-loader!./_demo-state';
import screensCode from '!!raw-loader!./_screens';
import stateInputSystemCode from '!!raw-loader!./_state-input.system';
import starComponentCode from '!!raw-loader!./_star.component';
import starSystemCode from '!!raw-loader!./_star.system';
import playerComponentCode from '!!raw-loader!./_player.component';
import playerSystemCode from '!!raw-loader!./_player.system';
import hudSystemCode from '!!raw-loader!./_hud.system';
import createLabelCode from '!!raw-loader!./_create-label';

import { DemoPage } from '@site/src/components/demo-page';

export default function GameStates(): JSX.Element {
  return (
    <DemoPage
      slug="game-states"
      createGame={createGameStatesGame}
      controls={[
        { inputs: ['Space'], action: 'Play', detail: 'Also plays again' },
        { inputs: ['←', 'A'], action: 'Move left' },
        { inputs: ['→', 'D'], action: 'Move right' },
        {
          inputs: ['Esc'],
          action: 'Back to the menu',
          detail: 'From the game-over screen',
        },
      ]}
      highlights={[
        {
          text: "Each state's setup system runs once, in the state's enter group, when that state is entered.",
          file: 'create-game.ts',
        },
        {
          text: 'Gameplay systems use an inState run condition, so they only run while playing and none of them checks the state.',
          file: 'create-game.ts',
        },
        {
          text: "State-scoped entities remove themselves: the menu text when the menu is left, and a round's stars and basket when the next round or the menu starts.",
          file: 'screens.ts',
        },
        {
          text: 'Because the round is only cleaned up later, its stars and basket stay visible behind the game-over screen.',
          file: 'star.system.ts',
        },
      ]}
      docLinks={[
        { label: 'Game states', to: '/docs/docs/states' },
        { label: 'Systems', to: '/docs/docs/ecs/system' },
        { label: 'Rendering text', to: '/docs/docs/text/rendering-text' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Creates the game state and registers each system with its run condition.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'States and screens',
          files: [
            {
              name: 'demo-state.ts',
              summary:
                'The three state names and the round score the systems share.',
              content: demoStateCode,
            },
            {
              name: 'screens.ts',
              summary:
                'Enter systems that build the menu, a round and the game-over screen.',
              content: screensCode,
            },
            {
              name: 'state-input.system.ts',
              summary:
                'Switches state when Space or Escape is pressed on the menu or game-over screen.',
              content: stateInputSystemCode,
            },
            {
              name: 'create-label.ts',
              summary: 'Creates a centered line of text.',
              content: createLabelCode,
            },
          ],
        },
        {
          title: 'Playing a round',
          files: [
            {
              name: 'player.component.ts',
              summary: "The basket's speed, width and how far it can move.",
              content: playerComponentCode,
            },
            {
              name: 'player.system.ts',
              summary: 'Moves the basket left and right with the input.',
              content: playerSystemCode,
            },
            {
              name: 'star.component.ts',
              summary: "A falling star's speed.",
              content: starComponentCode,
            },
            {
              name: 'star.system.ts',
              summary:
                'Spawns falling stars, scores catches and ends the round after three misses.',
              content: starSystemCode,
            },
            {
              name: 'hud.system.ts',
              summary: "Writes the round's score into the score text.",
              content: hudSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
