import React, { JSX } from 'react';
import { createCarGame } from './_create-game';
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
import airControlComponentCode from '!!raw-loader!./_air-control.component';
import airControlSystemCode from '!!raw-loader!./_air-control.system';
import groundContactComponentCode from '!!raw-loader!./_ground-contact.component';
import groundContactSystemCode from '!!raw-loader!./_ground-contact.system';

import { DemoPage } from '@site/src/components/demo-page/DemoPage';

export default function Car(): JSX.Element {
  return (
    <DemoPage
      title="Car"
      summary="Drive a car with working suspension over procedurally generated hills. It's built from the physics engine's rigid bodies, joints, springs and motors."
      createGame={createCarGame}
      controls={[
        {
          keys: ['→', 'D'],
          action: 'Accelerate',
          detail: 'In the air: tilt back',
        },
        {
          keys: ['←', 'A'],
          action: 'Brake / reverse',
          detail: 'In the air: tilt forward',
        },
        { keys: ['R'], action: 'Restart' },
      ]}
      highlights={[
        {
          text: 'The chassis and both wheels are separate rigid bodies.',
          file: 'create-car.ts',
        },
        {
          text: 'Each wheel hangs from a hidden hub: a prismatic joint for suspension travel, a revolute joint so it can spin, and a spring and damper for the bounce.',
          file: 'create-car.ts',
        },
        {
          text: 'A motor spins each wheel, and friction with the ground decides how much of that becomes speed.',
          file: 'wheel-drive.system.ts',
        },
        {
          text: 'With both wheels off the ground, the throttle tilts the car so you can line up a landing.',
          file: 'air-control.system.ts',
        },
        {
          text: 'The hills are a single terrain collider, drawn with a mesh built from the same points.',
          file: 'create-terrain.ts',
        },
      ]}
      docLinks={[
        { label: 'Rigid bodies', to: '/docs/docs/physics/rigid-bodies' },
        { label: 'Joints', to: '/docs/docs/physics/joints' },
        { label: 'Forces', to: '/docs/docs/physics/forces' },
        { label: 'Terrain', to: '/docs/docs/physics/terrain' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up the camera, terrain and car, and registers every system in the order they run.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Building the scene',
          files: [
            {
              name: 'create-car.ts',
              summary:
                'Builds the chassis, wheels and suspension, and the tuning values that make it drive well.',
              content: createCarCode,
            },
            {
              name: 'create-terrain.ts',
              summary:
                'Generates the hills, their collider and the mesh that draws them.',
              content: createTerrainCode,
            },
            {
              name: 'create-inputs.ts',
              summary: 'Binds the arrow keys, A/D and R to game actions.',
              content: createInputsCode,
            },
          ],
        },
        {
          title: 'Driving',
          files: [
            {
              name: 'ground-contact.component.ts',
              summary: 'Stores how many ground bodies a wheel is touching.',
              content: groundContactComponentCode,
            },
            {
              name: 'ground-contact.system.ts',
              summary: "Counts each wheel's ground contacts every tick.",
              content: groundContactSystemCode,
            },
            {
              name: 'wheel-drive.component.ts',
              summary:
                "Settings for driving a wheel's motor from the throttle.",
              content: wheelDriveComponentCode,
            },
            {
              name: 'wheel-drive.system.ts',
              summary:
                "Sets each wheel motor's speed and torque from the throttle.",
              content: wheelDriveSystemCode,
            },
          ],
        },
        {
          title: 'Balance',
          files: [
            {
              name: 'chassis-stabilizer.component.ts',
              summary: 'Settings for pulling the chassis back to level.',
              content: chassisStabilizerComponentCode,
            },
            {
              name: 'chassis-stabilizer.system.ts',
              summary: 'Levels the chassis while a wheel is on the ground.',
              content: chassisStabilizerSystemCode,
            },
            {
              name: 'air-control.component.ts',
              summary: 'Settings for tilting the car in mid-air.',
              content: airControlComponentCode,
            },
            {
              name: 'air-control.system.ts',
              summary: 'Tilts the car with the throttle while it is airborne.',
              content: airControlSystemCode,
            },
          ],
        },
        {
          title: 'Camera and reset',
          files: [
            {
              name: 'camera-follow.component.ts',
              summary: 'Settings for a camera that follows an entity.',
              content: cameraFollowComponentCode,
            },
            {
              name: 'camera-follow.system.ts',
              summary: 'Moves the camera smoothly after the car.',
              content: cameraFollowSystemCode,
            },
            {
              name: 'car-reset.component.ts',
              summary: "Each body's spawn point, for restarting.",
              content: carResetComponentCode,
            },
            {
              name: 'car-reset.system.ts',
              summary: 'Puts the car back at the start when R is pressed.',
              content: carResetSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
