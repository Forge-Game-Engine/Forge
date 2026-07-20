import React, { JSX } from 'react';
import { createLinearSpringDamperGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createSuspensionsCode from '!!raw-loader!./_create-suspensions';
import resetComponentCode from '!!raw-loader!./_reset.component';
import resetSystemCode from '!!raw-loader!./_reset.system';
import springLineComponentCode from '!!raw-loader!./_spring-line.component';
import springLineSystemCode from '!!raw-loader!./_spring-line.system';

import { Demo } from '@site/src/components/Demo';

export default function LinearSpringDamper(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: 'Linear Spring and Damper Demo',
        description:
          "A demo showcasing the physics engine's LinearSpring and LinearDamper: position- and velocity-based forces connecting two bodies, used to model vehicle suspension.",
      }}
      header="Linear Spring and Damper (Suspension)"
      blurb="Both columns hang a chassis from a fixed anchor with a LinearSpring, released with a downward velocity to simulate just having hit a bump, then every few seconds teleported back to that same starting position and velocity to replay the same drop (see reset.component.ts and reset.system.ts; a repeated impulse instead would risk pumping unbounded energy into the undamped column over a long-running demo). The left chassis has only a spring: once disturbed, it keeps oscillating until the next reset, with nothing to dissipate its energy. The right chassis pairs the same spring with a LinearDamper, which resists the compression/extension speed and settles the chassis back to rest well before the next reset, the same role a shock absorber plays alongside a suspension spring. The connecting line's length visualizes each spring's current stretch."
      createGame={createLinearSpringDamperGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'create-suspensions.ts',
          content: createSuspensionsCode,
        },
        {
          name: 'reset.component.ts',
          content: resetComponentCode,
        },
        {
          name: 'reset.system.ts',
          content: resetSystemCode,
        },
        {
          name: 'spring-line.component.ts',
          content: springLineComponentCode,
        },
        {
          name: 'spring-line.system.ts',
          content: springLineSystemCode,
        },
      ]}
    />
  );
}
