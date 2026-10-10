import React, { JSX } from 'react';
import { createTorqueGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createFlywheelsCode from '!!raw-loader!./_create-flywheels';
import thrusterComponentCode from '!!raw-loader!./_thruster.component';
import thrusterSystemCode from '!!raw-loader!./_thruster.system';
import gustComponentCode from '!!raw-loader!./_gust.component';
import gustSystemCode from '!!raw-loader!./_gust.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function Torque(): JSX.Element {
  return (
    <DemoPage
      slug="torque"
      createGame={createTorqueGame}
      controls={[
        {
          inputs: ['Space'],
          action: 'Spin the left flywheel',
          detail: 'Hold to keep applying torque',
        },
      ]}
      highlights={[
        {
          text: 'While Space is held, a small game system calls applyTorque on the left flywheel every tick.',
          file: 'thruster.system.ts',
        },
        {
          text: 'Let go and angular drag on the left flywheel slowly spins it back down, since nothing drives it anymore.',
          file: 'create-flywheels.ts',
        },
        {
          text: "The right flywheel has the engine's AngularVelocityMotorEcsComponent, which holds a target spin speed with no input at all.",
          file: 'create-flywheels.ts',
        },
        {
          text: 'Every few seconds a gust knocks the right flywheel off speed, and the motor uses its limited maxTorque to recover.',
          file: 'gust.system.ts',
        },
      ]}
      docLinks={[
        { label: 'Forces', to: '/docs/docs/physics/forces' },
        { label: 'Rigid bodies', to: '/docs/docs/physics/rigid-bodies' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Binds Space, creates both flywheels and registers the systems in order.',
              content: gameCode,
            },
            {
              name: 'create-flywheels.ts',
              summary:
                'Builds the thruster flywheel and the motor-driven flywheel.',
              content: createFlywheelsCode,
            },
          ],
        },
        {
          title: 'Thruster',
          files: [
            {
              name: 'thruster.component.ts',
              summary: 'The input and torque for a player-driven thruster.',
              content: thrusterComponentCode,
            },
            {
              name: 'thruster.system.ts',
              summary:
                'Applies torque to the flywheel while the input is held.',
              content: thrusterSystemCode,
            },
          ],
        },
        {
          title: 'Gust',
          files: [
            {
              name: 'gust.component.ts',
              summary: 'How hard and how often a gust knocks a flywheel.',
              content: gustComponentCode,
            },
            {
              name: 'gust.system.ts',
              summary:
                "Periodically changes the flywheel's spin, alternating direction.",
              content: gustSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
