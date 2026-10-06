import React, { JSX } from 'react';
import { createGameStatesGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import demoStateCode from '!!raw-loader!./_demo-state';
import screensCode from '!!raw-loader!./_screens';
import stateInputSystemCode from '!!raw-loader!./_state-input.system';
import starSystemCode from '!!raw-loader!./_star.system';
import playerSystemCode from '!!raw-loader!./_player.system';
import hudSystemCode from '!!raw-loader!./_hud.system';
import createLabelCode from '!!raw-loader!./_create-label';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { KeyboardKey } from '@site/src/components/_KeyboardKey';

export default function GameStates(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Game States Demo',
        description:
          'A demo showcasing game states, run conditions and state-scoped entities.',
      }}
      header="Game States"
      blurb="A menu, a round and a game-over screen, switched with a GameState. Each state's setup runs once when it's entered, gameplay systems only run while playing, and state-scoped entities are removed on the transitions that end them: the menu's text when it's left, and a round's stars and basket when the next round or the menu starts, so they stay behind the game-over screen. No system checks the state or cleans up after a round."
      createGame={createGameStatesGame}
      interactions={
        <>
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="Space" />}
            text="Play, or play again."
          />
          <InteractionInstruction
            displayElement={
              <>
                <KeyboardKey keyCode="←" />
                <KeyboardKey keyCode="→" />
              </>
            }
            text="Move the basket."
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="Esc" />}
            text="Back to the menu from the game-over screen."
          />
        </>
      }
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'demo-state.ts', content: demoStateCode },
        { name: 'screens.ts', content: screensCode },
        { name: 'state-input.system.ts', content: stateInputSystemCode },
        { name: 'star.system.ts', content: starSystemCode },
        { name: 'player.system.ts', content: playerSystemCode },
        { name: 'hud.system.ts', content: hudSystemCode },
        { name: 'create-label.ts', content: createLabelCode },
      ]}
    />
  );
}
