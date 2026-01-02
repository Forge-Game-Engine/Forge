import React, { JSX } from 'react';
import { createSpaceShooterGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import playerComponentCode from '!!raw-loader!./_player.component';
import movementSystemCode from '!!raw-loader!./_movement.system';
import createBackgroundMaterialCode from '!!raw-loader!./_create-background';
import backgroundSystemCode from '!!raw-loader!./_background.system';
import backgroundComponentCode from '!!raw-loader!./_background.component';
import backgroundShaderCode from '!!raw-loader!./_background.shader';
import createMusicCode from '!!raw-loader!./_create-music';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { KeyboardKey } from '@site/src/components/_KeyboardKey';

export default function Rendering(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Space Shooter Demo',
        description: 'A demo showcasing a full space shooter game.',
      }}
      header="Space Shooter"
      blurb="This demo showcases a complete space shooter game built using the Forge Game Engine. It features player-controlled movement, shooting mechanics, enemy spawning, and collision detection. The game demonstrates how to leverage the engine's capabilities to create an engaging and interactive experience. Players can navigate their spaceship, avoid obstacles, and shoot down enemies while enjoying smooth rendering and responsive controls."
      createGame={createSpaceShooterGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'player.component.ts',
          content: playerComponentCode,
        },
        {
          name: 'movement.system.ts',
          content: movementSystemCode,
        },
        {
          name: 'create-background.ts',
          content: createBackgroundMaterialCode,
        },
        {
          name: 'create-music.ts',
          content: createMusicCode,
        },
        {
          name: 'background.system.ts',
          content: backgroundSystemCode,
        },
        {
          name: 'background.component.ts',
          content: backgroundComponentCode,
        },
        {
          name: 'background.shader.ts',
          content: backgroundShaderCode,
        },
      ]}
      interactions={
        <>
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="A" />}
            text="Left"
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="D" />}
            text="Right"
          />

          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="␣" />}
            text="Shoot"
          />
        </>
      }
    />
  );
}
