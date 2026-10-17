import React, { JSX } from 'react';
import { createErosionBurnGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createSpriteCode from '!!raw-loader!./_create-sprite';
import erosionComponentCode from '!!raw-loader!./_erosion.component';
import erosionSystemCode from '!!raw-loader!./_erosion.system';
import erosionShaderCode from '!!raw-loader!./_erosion.shader';

import { DemoPage } from '@site/src/components/demo-page';

export default function ErosionBurn(): JSX.Element {
  return (
    <DemoPage
      slug="erosion-burn"
      createGame={createErosionBurnGame}
      highlights={[
        {
          text: 'A custom fragment shader hides every pixel whose Perlin noise value is below the burn line.',
          file: 'erosion.shader.ts',
        },
        {
          text: 'Just ahead of the burn line, a gradient texture tints the edge yellow, orange and white so it looks like it smoulders.',
          file: 'erosion.shader.ts',
        },
        {
          text: "The material keeps the engine's default sprite vertex shader and adds two extra textures and two uniforms.",
          file: 'create-sprite.ts',
        },
        {
          text: 'A system moves the burn line back and forth each frame by setting a material uniform.',
          file: 'erosion.system.ts',
        },
      ]}
      docLinks={[
        {
          label: 'Custom sprite shaders',
          to: '/docs/docs/rendering/sprites',
        },
        { label: 'Materials', to: '/docs/docs/rendering/material-uniforms' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Places the burning sprite, tags it and registers the systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'The burn effect',
          files: [
            {
              name: 'erosion.shader.ts',
              summary:
                'The fragment shader that erodes alpha with noise and colors the edge.',
              content: erosionShaderCode,
            },
            {
              name: 'create-sprite.ts',
              summary:
                'Loads the textures and builds a sprite material with the erosion shader.',
              content: createSpriteCode,
            },
            {
              name: 'erosion.component.ts',
              summary: 'A tag marking the sprites the erosion system animates.',
              content: erosionComponentCode,
            },
            {
              name: 'erosion.system.ts',
              summary:
                'Moves the burn line in and out by updating a shader uniform.',
              content: erosionSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
