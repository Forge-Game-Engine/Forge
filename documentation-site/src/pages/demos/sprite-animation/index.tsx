import React, { JSX } from 'react';
import { createSpriteAnimationGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createPlayerCode from '!!raw-loader!./_create-player';
import createInputsCode from '!!raw-loader!./_create-inputs';
import movementSystemCode from '!!raw-loader!./_movement.system';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { KeyboardKey } from '@site/src/components/_KeyboardKey';

export default function SpriteAnimation(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Sprite Animation Demo',
        description:
          'A demo showcasing the sprite animation system: slicing a sprite sheet into idle and run clips and switching between them from keyboard input.',
      }}
      header="Sprite Animation"
      blurb="A standalone showcase of the sprite animation system: the adventurer sprite sheet is sliced into an idle clip and a run clip with createSpriteSheet and selectAnimationFrames, both registered in an AssetRegistry, and attached to the character via a SpriteAnimationEcsComponent. Holding a movement key drives the character's position directly, switches its animationClipHandle from the idle clip to the run clip (resetting animationFrameIndex, since the two clips have different frame counts), and flips the sprite with a FlipEcsComponent to face its direction of travel. Releasing every movement key returns it to the idle clip."
      createGame={createSpriteAnimationGame}
      interactions={
        <>
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="A" />}
            text="Move left"
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="D" />}
            text="Move right"
          />
        </>
      }
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
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
          name: 'movement.system.ts',
          content: movementSystemCode,
        },
      ]}
    />
  );
}
