import React, { JSX } from 'react';
import { createRollingBallGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createTerrainCode from '!!raw-loader!./_create-terrain';
import terrainCurveCode from '!!raw-loader!./_terrain-curve';
import terrainRenderSystemCode from '!!raw-loader!./_terrain-render.system';
import loadTiledTextureCode from '!!raw-loader!./_load-tiled-texture';
import terrainVertCode from '!!raw-loader!./_terrain.vert.glsl';
import terrainFragCode from '!!raw-loader!./_terrain.frag.glsl';
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
          'A demo showcasing TerrainShape with a smooth, textured, curve-generated course and a player-controlled ball that rolls via friction from an AngularVelocityMotorEcsComponent.',
      }}
      header="Rolling Ball"
      blurb="A standalone showcase of TerrainShape: a long course whose smooth silhouette comes from a Catmull-Rom curve through sparse, randomly-placed control points, triangulated into a single mesh and textured with a tileable grass-like border blending into a tileable dirt-like fill. TerrainShape's own collision points are sampled from that exact same curve, so what's drawn always matches what the ball touches. Roll input drives the ball's AngularVelocityMotorEcsComponent, and friction against the terrain - ordinary collision resolution, nothing special-cased - turns that spin into rolling motion up and down the hills. A small camera-follow system keeps the ball in view as it travels, and a jump impulse fires while grounded (tracked via PhysicsWorld.collisionStarts/collisionEnds against the terrain body)."
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
          name: 'terrain-curve.ts',
          content: terrainCurveCode,
        },
        {
          name: 'terrain-render.system.ts',
          content: terrainRenderSystemCode,
        },
        {
          name: 'load-tiled-texture.ts',
          content: loadTiledTextureCode,
        },
        {
          name: 'terrain.vert.glsl',
          content: terrainVertCode,
        },
        {
          name: 'terrain.frag.glsl',
          content: terrainFragCode,
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
