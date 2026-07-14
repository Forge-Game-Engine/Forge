import React, { JSX } from 'react';
import { createBrickBreakerGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createBackgroundCode from '!!raw-loader!./_create-background';
import backgroundComponentCode from '!!raw-loader!./_background.component';
import backgroundSystemCode from '!!raw-loader!./_background.system';
import backgroundShaderCode from '!!raw-loader!./_background.shader';
import createBoundariesCode from '!!raw-loader!./_create-boundaries';
import paddleComponentCode from '!!raw-loader!./_paddle.component';
import paddleSystemCode from '!!raw-loader!./_paddle.system';
import createPaddleCode from '!!raw-loader!./_create-paddle';
import ballComponentCode from '!!raw-loader!./_ball.component';
import createBallCode from '!!raw-loader!./_create-ball';
import ballSystemCode from '!!raw-loader!./_ball.system';
import createBricksCode from '!!raw-loader!./_create-bricks';
import brickComponentCode from '!!raw-loader!./_brick.component';
import brickSystemCode from '!!raw-loader!./_brick.system';
import brickShaderCode from '!!raw-loader!./_brick.shader';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { KeyboardKey } from '@site/src/components/_KeyboardKey';

export default function BrickBreaker(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Brick Breaker Demo',
        description: 'A demo showcasing a simple brick breaker game.',
      }}
      header="Brick Breaker"
      blurb="This demo showcases a brick breaker game built using the Forge Game Engine. A paddle, ball and grid of bricks are all native rigid bodies, so the ball bounces off the walls, paddle and bricks using the engine's built-in collision detection and resolution rather than any custom bounce logic. Break all the bricks and a fresh grid spawns in to keep the game going."
      createGame={createBrickBreakerGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-background.ts',
          content: createBackgroundCode,
        },
        {
          name: 'background.component.ts',
          content: backgroundComponentCode,
        },
        {
          name: 'background.system.ts',
          content: backgroundSystemCode,
        },
        {
          name: 'background.shader.ts',
          content: backgroundShaderCode,
        },
        {
          name: 'ball.component.ts',
          content: ballComponentCode,
        },
        {
          name: 'ball.system.ts',
          content: ballSystemCode,
        },
        {
          name: 'create-ball.ts',
          content: createBallCode,
        },
        {
          name: 'create-boundaries.ts',
          content: createBoundariesCode,
        },
        {
          name: 'create-bricks.ts',
          content: createBricksCode,
        },
        {
          name: 'brick.component.ts',
          content: brickComponentCode,
        },
        {
          name: 'brick.system.ts',
          content: brickSystemCode,
        },
        {
          name: 'brick.shader.ts',
          content: brickShaderCode,
        },
        {
          name: 'create-paddle.ts',
          content: createPaddleCode,
        },
        {
          name: 'paddle.component.ts',
          content: paddleComponentCode,
        },
        {
          name: 'paddle.system.ts',
          content: paddleSystemCode,
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
            displayElement={<span>🎮</span>}
            text="Move with left stick or D-pad"
          />
        </>
      }
    />
  );
}
