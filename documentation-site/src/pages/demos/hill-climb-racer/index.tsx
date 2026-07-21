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
import airControlComponentCode from '!!raw-loader!./_air-control.component';
import airControlSystemCode from '!!raw-loader!./_air-control.system';

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
      blurb="This demo composes several of the physics engine's existing primitives into a drivable car: the chassis, both wheels, and a small invisible 'upright' body per wheel (a wheel hub/knuckle) are all independent RigidBody instances, and each wheel is driven by an AngularVelocityMotorEcsComponent (see the Torque and Motors demo) whose target speed tracks the throttle input. Each wheel mounts to the chassis through its upright: a PrismaticJoint (see the Prismatic Joint demo) constrains the upright to slide only vertically relative to the chassis, a RevoluteJoint (see the Revolute Joint demo) pins the wheel's position to that upright while leaving its rotation completely free to spin, and a LinearSpring/LinearDamper pair (see the Linear Spring and Damper demo) along that same axis supplies the suspension's force. Wiring either joint straight to the wheel wouldn't work - a RevoluteJoint would pin it rigidly in place with no suspension travel, and a PrismaticJoint locks relative rotation, which would lock the wheel's spin to the chassis - so the upright exists specifically to give the wheel a rotation-free attachment point. Unlike a spring-only mount, both joints are hard, iteratively-solved constraints with no lateral give, so the wheel only ever travels along that one axis, no swinging or sideways slop. Because the mount's *force* still comes from a soft spring rather than a rigid frame, accelerating and braking visibly pitches the chassis backward and forward, the 'leaning' feel the genre is named for; a light demo-only ChassisStabilizerEcsComponent nudges the chassis back level once nothing else is actively tipping it, without fighting a deliberate acceleration or brake lean. Each wheel mount's PrismaticJoint axis is also tilted outward rather than straight up/down, so the line from each chassis anchor to its wheel splays into a trapezoid instead of a rectangle, like a monster truck's lifted suspension - besides the visual, this gives an impact that's perpendicular to the chassis (hitting a ledge face-on) a component along the suspension axis for the spring to absorb, rather than landing entirely on the joint's hard, unsprung constraint. The terrain is a row of static, unrotated ground columns following a procedurally generated height profile, and a demo-only camera-follow system (the engine's built-in camera only supports input-driven pan/zoom) keeps the car in view as it drives across a course much wider than the canvas. While airborne (neither wheel touching a ground column, tracked by a demo-only AirControlEcsComponent/system pair from PhysicsWorld's collisionStarts/collisionEnds), the throttle input instead pitches the chassis directly via RigidBody.applyTorque - gas tilts the nose up and back, brake tilts it down and forward - the classic Hill Climb Racer mid-air control for lining up a landing. The hills get steep further along the course - if the car flips or gets stuck, press R to restart."
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
        {
          name: 'air-control.component.ts',
          content: airControlComponentCode,
        },
        {
          name: 'air-control.system.ts',
          content: airControlSystemCode,
        },
      ]}
    />
  );
}
