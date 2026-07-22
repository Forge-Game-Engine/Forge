import React, { JSX } from 'react';
import { createRollingBallGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createTerrainCode from '!!raw-loader!./_create-terrain';
import createPlayerCode from '!!raw-loader!./_create-player';
import createInputsCode from '!!raw-loader!./_create-inputs';
import rollSystemCode from '!!raw-loader!./_roll.system';
import jumpSystemCode from '!!raw-loader!./_jump.system';
import cameraFollowSystemCode from '!!raw-loader!./_camera-follow.system';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { KeyboardKey } from '@site/src/components/_KeyboardKey';

export default function RollingBall(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Rolling Ball Demo',
        description:
          'A demo showcasing TerrainShape with a long, varied-height course and a player-controlled ball that rolls via friction from an AngularVelocityMotorEcsComponent.',
      }}
      header="Rolling Ball"
      blurb="A standalone showcase of TerrainShape: a long course with varied, seeded-random hills, and a ball you control directly. Roll input drives the ball's AngularVelocityMotorEcsComponent, and friction against the terrain - ordinary collision resolution, nothing special-cased - turns that spin into rolling motion up and down the hills. A small camera-follow system keeps the ball in view as it travels, and a jump impulse fires while grounded (tracked via PhysicsWorld.collisionStarts/collisionEnds against the terrain body)."
      createGame={createRollingBallGame}
      interactions={
        <>
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="A" />}
            text="Roll left"
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="D" />}
            text="Roll right"
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="␣" />}
            text="Jump"
          />
        </>
      }
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-terrain.ts',
          content: createTerrainCode,
        },
        {
          name: 'create-player.ts',
          content: createPlayerCode,
        },
        {
          name: 'create-inputs.ts',
          content: createInputsCode,
        },
        {
          name: 'roll.system.ts',
          content: rollSystemCode,
        },
        {
          name: 'jump.system.ts',
          content: jumpSystemCode,
        },
        {
          name: 'camera-follow.system.ts',
          content: cameraFollowSystemCode,
        },
      ]}
    />
  );
}
