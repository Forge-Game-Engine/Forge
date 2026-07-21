import React, { JSX } from 'react';
import { createHillClimbRacerGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createCarCode from '!!raw-loader!./_create-car';
import createTerrainCode from '!!raw-loader!./_create-terrain';
import createInputsCode from '!!raw-loader!./_create-inputs';
import wheelDriveComponentCode from '!!raw-loader!./_wheel-drive.component';
import wheelDriveSystemCode from '!!raw-loader!./_wheel-drive.system';
import cameraFollowComponentCode from '!!raw-loader!./_camera-follow.component';
import cameraFollowSystemCode from '!!raw-loader!./_camera-follow.system';
import carResetComponentCode from '!!raw-loader!./_car-reset.component';
import carResetSystemCode from '!!raw-loader!./_car-reset.system';
import chassisStabilizerComponentCode from '!!raw-loader!./_chassis-stabilizer.component';
import chassisStabilizerSystemCode from '!!raw-loader!./_chassis-stabilizer.system';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { KeyboardKey } from '@site/src/components/_KeyboardKey';

export default function HillClimbRacer(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Hill Climb Racer Demo',
        description:
          'A demo showing how to set up a hill-climb-racer-style car with the physics engine: a chassis with two spring-suspended, motor-driven wheels climbing a procedurally generated hill.',
      }}
      header="Hill Climb Racer"
      blurb="This demo composes several of the physics engine's existing primitives into a drivable car: the chassis and both wheels are independent RigidBody instances (no rigid frame connecting them), each wheel hangs below the chassis on a LinearSpring/LinearDamper pair (see the Linear Spring and Damper demo - the same components used there for vehicle suspension), and each wheel is driven by an AngularVelocityMotorEcsComponent (see the Torque and Motors demo) whose target speed tracks the throttle input. Because the wheels are only ever connected to the chassis through soft springs, accelerating and braking visibly pitches the chassis backward and forward, the 'leaning' feel the genre is named for. A pair of independently-solved springs has no equivalent of a real suspension's control-arm geometry to keep the chassis level on its own, so a light demo-only ChassisStabilizerEcsComponent nudges it back level once nothing else is actively tipping it, without fighting a deliberate acceleration or brake lean. The terrain is a chain of static ground segments following a procedurally generated height profile, and a demo-only camera-follow system (the engine's built-in camera only supports input-driven pan/zoom) keeps the car in view as it drives across a course much wider than the canvas. The hills get steep further along the course - if the car flips or gets stuck, press R to restart."
      createGame={createHillClimbRacerGame}
      interactions={
        <>
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="→" />}
            text="Accelerate"
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="D" />}
            text="Accelerate"
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="←" />}
            text="Brake / Reverse"
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="A" />}
            text="Brake / Reverse"
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="R" />}
            text="Restart"
          />
        </>
      }
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-car.ts',
          content: createCarCode,
        },
        {
          name: 'create-terrain.ts',
          content: createTerrainCode,
        },
        {
          name: 'create-inputs.ts',
          content: createInputsCode,
        },
        {
          name: 'wheel-drive.component.ts',
          content: wheelDriveComponentCode,
        },
        {
          name: 'wheel-drive.system.ts',
          content: wheelDriveSystemCode,
        },
        {
          name: 'camera-follow.component.ts',
          content: cameraFollowComponentCode,
        },
        {
          name: 'camera-follow.system.ts',
          content: cameraFollowSystemCode,
        },
        {
          name: 'car-reset.component.ts',
          content: carResetComponentCode,
        },
        {
          name: 'car-reset.system.ts',
          content: carResetSystemCode,
        },
        {
          name: 'chassis-stabilizer.component.ts',
          content: chassisStabilizerComponentCode,
        },
        {
          name: 'chassis-stabilizer.system.ts',
          content: chassisStabilizerSystemCode,
        },
      ]}
    />
  );
}
