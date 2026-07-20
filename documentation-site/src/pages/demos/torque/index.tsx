import React, { JSX } from 'react';
import { createTorqueGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createFlywheelsCode from '!!raw-loader!./_create-flywheels';
import thrusterComponentCode from '!!raw-loader!./_thruster.component';
import thrusterSystemCode from '!!raw-loader!./_thruster.system';
import gustComponentCode from '!!raw-loader!./_gust.component';
import gustSystemCode from '!!raw-loader!./_gust.system';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { KeyboardKey } from '@site/src/components/_KeyboardKey';

export default function Torque(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Torque and Motors Demo',
        description:
          "A demo showcasing RigidBody.applyTorque and the physics engine's AngularVelocityMotorEcsComponent, for spinning a body with torque.",
      }}
      header="Torque and Motors"
      blurb="This demo showcases the two ways to spin a RigidBody with torque. On the left, a flywheel carries a demo-specific ThrusterEcsComponent: while Space is held, createThrusterEcsSystem calls RigidBody.applyTorque on it directly every tick, spinning it up, and releasing lets a small angularDrag on the body gradually spin it back down, since nothing drives it once the torque stops. There's no engine-provided component for this one-shot/manual case, a game is expected to write a small system like this itself. On the right, a flywheel carries an AngularVelocityMotorEcsComponent, a built-in engine component that holds a steady target angular velocity on its own, no input needed, with no angularDrag of its own; a demo-only gust periodically knocks its speed off course, and the motor spends its limited maxTorque budget correcting back towards the target every tick afterwards."
      createGame={createTorqueGame}
      interactions={
        <InteractionInstruction
          displayElement={<KeyboardKey keyCode="␣" />}
          text="Hold to thrust"
        />
      }
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-flywheels.ts',
          content: createFlywheelsCode,
        },
        {
          name: 'thruster.component.ts',
          content: thrusterComponentCode,
        },
        {
          name: 'thruster.system.ts',
          content: thrusterSystemCode,
        },
        {
          name: 'gust.component.ts',
          content: gustComponentCode,
        },
        {
          name: 'gust.system.ts',
          content: gustSystemCode,
        },
      ]}
    />
  );
}
