import React, { JSX } from 'react';
import { createRacingGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createInputsCode from '!!raw-loader!./_create-inputs';
import createPlayerCode from '!!raw-loader!./_create-player';
import createSceneCode from '!!raw-loader!./_create-scene';
import movementSystemCode from '!!raw-loader!./_movement.system';
import playerComponentCode from '!!raw-loader!./_player.component';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { KeyboardKey } from '@site/src/components/_KeyboardKey';

export default function Racing(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Racing Demo',
        description: 'A demo showcasing a simple top-down racing scene.',
      }}
      header="Racing"
      blurb="This demo showcases a simple top-down racing scene built with the Forge Game Engine using Kenney's racing asset pack. The car cruises forward on its own - steer it left and right around a barrier-lined track scattered with cones, tires, barrels, rocks and an oil slick, and use the throttle to speed up or slow down."
      createGame={createRacingGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-inputs.ts',
          content: createInputsCode,
        },
        {
          name: 'create-player.ts',
          content: createPlayerCode,
        },
        {
          name: 'create-scene.ts',
          content: createSceneCode,
        },
        {
          name: 'movement.system.ts',
          content: movementSystemCode,
        },
        {
          name: 'player.component.ts',
          content: playerComponentCode,
        },
      ]}
      interactions={
        <>
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="W" />}
            text="Speed up"
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="A" />}
            text="Steer left"
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="S" />}
            text="Slow down"
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="D" />}
            text="Steer right"
          />
        </>
      }
    />
  );
}
