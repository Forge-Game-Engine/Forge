import React, { JSX } from 'react';
import { createVisibilityGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import menuCode from '!!raw-loader!./_create-menu';
import beaconCode from '!!raw-loader!./_create-beacon';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';

const badgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  borderRadius: '50%',
  backgroundColor: 'var(--ifm-color-emphasis-300)',
  fontSize: 12,
};

export default function Visibility(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Visibility',
        description:
          'A demo showcasing VisibilityEcsComponent hiding an entity and everything parented under it, in the world and in UI.',
      }}
      header="Visibility"
      blurb="Each toggle sets one VisibilityEcsComponent. Hiding 'Load game' takes it out of the menu's vertical layout group, so the buttons below move up and the panel shrinks. Hiding the menu hides the panel, its title and every button, which can no longer be hovered, clicked or focused. Fading the menu sets a canvas group's alpha instead: the menu stays laid out, drawn and clickable. Hiding the beacon hides its lamp and stops its spark emitter, while sparks already in the air fade out."
      createGame={createVisibilityGame}
      interactions={
        <>
          <InteractionInstruction
            displayElement={
              <div style={badgeStyle}>
                <i className="fa-solid fa-computer-mouse" />
              </div>
            }
            text="Click the toggles to hide and show parts of the scene."
          />
          <InteractionInstruction
            displayElement={
              <div style={badgeStyle}>
                <i className="fa-solid fa-keyboard" />
              </div>
            }
            text="Arrow keys move focus; hiding the focused button clears focus."
          />
        </>
      }
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'menu.ts', content: menuCode },
        { name: 'beacon.ts', content: beaconCode },
      ]}
    />
  );
}
