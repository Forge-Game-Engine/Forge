import React, { JSX } from 'react';
import { createVehicleGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createTerrainCode from '!!raw-loader!./_create-terrain';
import createVehicleCode from '!!raw-loader!./_create-vehicle';
import vehicleControlSystemCode from '!!raw-loader!./_vehicle-control.system';
import cameraFollowSystemCode from '!!raw-loader!./_camera-follow.system';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { KeyboardKey } from '@site/src/components/_KeyboardKey';

export default function Vehicle(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Vehicle Demo',
        description:
          'A demo showcasing joints, continuous torque, and generated terrain.',
      }}
      header="Vehicle"
      blurb="This demo showcases the physics engine's joints, motors, and terrain generation together: a car chassis is suspended over two wheels by SpringJoints, each wheel driven by a WheelMotorEcsComponent, rolling over a bumpy, climbing course built with createTerrainBodies. Drive up the hill without tipping over or stalling on a bump."
      createGame={createVehicleGame}
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
          name: 'create-vehicle.ts',
          content: createVehicleCode,
        },
        {
          name: 'vehicle-control.system.ts',
          content: vehicleControlSystemCode,
        },
        {
          name: 'camera-follow.system.ts',
          content: cameraFollowSystemCode,
        },
      ]}
      interactions={
        <>
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="D" />}
            text="Drive forward"
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="A" />}
            text="Reverse"
          />
          <InteractionInstruction
            displayElement={<span>🎮</span>}
            text="Drive with left stick"
          />
        </>
      }
    />
  );
}
