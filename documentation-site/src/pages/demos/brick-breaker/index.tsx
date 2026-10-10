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

import { DemoPage } from '@site/src/components/demo-page';

export default function BrickBreaker(): JSX.Element {
  return (
    <DemoPage
      slug="brick-breaker"
      createGame={createBrickBreakerGame}
      controls={[
        { inputs: ['←', 'A'], action: 'Move left' },
        { inputs: ['→', 'D'], action: 'Move right' },
        {
          inputs: [
            { device: 'gamepad', label: 'Left stick' },
            { device: 'gamepad', label: 'D-pad' },
          ],
          action: 'Move',
        },
      ]}
      highlights={[
        {
          text: "The ball, paddle, walls and bricks are all physics bodies, so every bounce comes from the engine's collision resolution, not custom bounce code.",
          file: 'create-ball.ts',
        },
        {
          text: "The ball's contacts list which bricks it touched this tick, and the ball system removes them.",
          file: 'ball.system.ts',
        },
        {
          text: 'When the last brick breaks, a fresh grid spawns so the game keeps going.',
          file: 'create-bricks.ts',
        },
        {
          text: 'Each brick is drawn with a custom fragment shader that adds a gloss and a moving sheen.',
          file: 'brick.shader.ts',
        },
        {
          text: 'The animated backdrop is a shader on its own camera and render layer, so it always draws behind the game.',
          file: 'create-background.ts',
        },
      ]}
      docLinks={[
        { label: 'Rigid bodies', to: '/docs/docs/physics/rigid-bodies' },
        { label: 'Collisions', to: '/docs/docs/physics/collisions' },
        {
          label: 'Material uniforms',
          to: '/docs/docs/rendering/material-uniforms',
        },
        { label: 'Input actions', to: '/docs/docs/input/actions' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up the cameras, inputs and scene, and registers every system in order.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Play area',
          files: [
            {
              name: 'create-boundaries.ts',
              summary:
                'Builds the top and side walls and returns the play area they bound.',
              content: createBoundariesCode,
            },
          ],
        },
        {
          title: 'Paddle',
          files: [
            {
              name: 'create-paddle.ts',
              summary:
                'Creates the paddle sprite and collider near the bottom of the play area.',
              content: createPaddleCode,
            },
            {
              name: 'paddle.component.ts',
              summary: "The paddle's speed and how far it can move each way.",
              content: paddleComponentCode,
            },
            {
              name: 'paddle.system.ts',
              summary:
                'Moves the paddle with the input axis, clamped to the walls.',
              content: paddleSystemCode,
            },
          ],
        },
        {
          title: 'Ball',
          files: [
            {
              name: 'create-ball.ts',
              summary:
                'Creates the ball as a bouncy rigid body and launches it at the bricks.',
              content: createBallCode,
            },
            {
              name: 'ball.component.ts',
              summary: "The ball's launch speed and start position.",
              content: ballComponentCode,
            },
            {
              name: 'ball.system.ts',
              summary:
                'Breaks bricks the ball touches and relaunches it after a miss.',
              content: ballSystemCode,
            },
          ],
        },
        {
          title: 'Bricks',
          files: [
            {
              name: 'create-bricks.ts',
              summary:
                'Lays out the brick grid and respawns it once every brick is gone.',
              content: createBricksCode,
            },
            {
              name: 'brick.component.ts',
              summary: 'A tag that marks an entity as a brick.',
              content: brickComponentCode,
            },
            {
              name: 'brick.system.ts',
              summary: "Feeds the current time to every brick's shader.",
              content: brickSystemCode,
            },
            {
              name: 'brick.shader.ts',
              summary:
                'A fragment shader that adds a gloss and a sweeping sheen to bricks.',
              content: brickShaderCode,
            },
          ],
        },
        {
          title: 'Background',
          files: [
            {
              name: 'create-background.ts',
              summary:
                'Creates a full-screen sprite drawn with the background shader.',
              content: createBackgroundCode,
            },
            {
              name: 'background.component.ts',
              summary: 'A tag that marks the background entity.',
              content: backgroundComponentCode,
            },
            {
              name: 'background.system.ts',
              summary: "Feeds the current time to the background's shader.",
              content: backgroundSystemCode,
            },
            {
              name: 'background.shader.ts',
              summary:
                'A slowly drifting blue-to-black gradient with a soft vignette.',
              content: backgroundShaderCode,
            },
          ],
        },
      ]}
    />
  );
}
