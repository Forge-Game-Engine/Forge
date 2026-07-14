import React, { JSX } from 'react';
import { createErosionBurnGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createSpriteCode from '!!raw-loader!./_create-sprite';
import erosionComponentCode from '!!raw-loader!./_erosion.component';
import erosionSystemCode from '!!raw-loader!./_erosion.system';
import erosionShaderCode from '!!raw-loader!./_erosion.shader';

import { Demo } from '@site/src/components/Demo';

export default function ErosionBurn(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Erosion Burn Demo',
        description:
          "A demo showcasing an alpha erosion burn shader eating away a sprite's edges.",
      }}
      header="Erosion Burn"
      blurb="This demo shows a custom fragment shader that erodes a sprite's alpha using a Perlin noise texture, while a gradient texture colors the leading edge bright yellow, orange and white to sell the look of it smouldering away. The shader reuses the engine's default sprite vertex shader and just swaps in a custom fragment shader with extra textures and uniforms, the same pattern used for the bricks in the Brick Breaker demo, here extended to take multiple textures on one material."
      createGame={createErosionBurnGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-sprite.ts',
          content: createSpriteCode,
        },
        {
          name: 'erosion.component.ts',
          content: erosionComponentCode,
        },
        {
          name: 'erosion.system.ts',
          content: erosionSystemCode,
        },
        {
          name: 'erosion.shader.ts',
          content: erosionShaderCode,
        },
      ]}
    />
  );
}
