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
          "A demo showcasing the physics engine's AppliedTorqueEcsComponent and AngularVelocityMotorEcsComponent, for spinning a body with torque.",
      }}
      header="Torque and Motors"
      blurb="This demo showcases the two ways to spin a RigidBody with torque. On the left, a flywheel carries an AppliedTorqueEcsComponent driven by a ThrusterEcsComponent: holding Space sets its value every tick, spinning the flywheel up, and releasing lets it coast at whatever speed it reached, since nothing opposes rotation and the torque itself resets to 0 the instant it's no longer held. On the right, a flywheel carries an AngularVelocityMotorEcsComponent holding a steady target angular velocity on its own, no input needed; a demo-only gust periodically knocks its speed off course, and the motor spends its limited maxTorque budget correcting back towards the target every tick afterwards."
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
