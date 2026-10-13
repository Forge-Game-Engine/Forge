import React, { JSX, useCallback, useRef, useState } from 'react';
import { createMeshesGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import exhaustCode from '!!raw-loader!./_create-exhaust';
import exhaustShaderCode from '!!raw-loader!./_exhaust.shader';
import exhaustSettingsCode from '!!raw-loader!./_exhaust-settings';

import {
  DemoPage,
  DemoPanel,
  DemoSettings,
  DemoSlider,
} from '@site/src/components/demo-page';
import type { Exhaust } from './_create-exhaust';
import {
  applyExhaustSettings,
  defaultExhaustSettings,
  ExhaustSettings,
  spriteOrders,
} from './_exhaust-settings';

const describeOrder = (order: number): string => {
  if (order < spriteOrders.background) {
    return `${order} (behind the background)`;
  }

  if (order < spriteOrders.ship) {
    return `${order} (behind the ship)`;
  }

  if (order < spriteOrders.asteroid) {
    return `${order} (over the ship)`;
  }

  return `${order} (over everything)`;
};

export default function Meshes(): JSX.Element {
  const exhaustRef = useRef<Exhaust | null>(null);
  const [settings, setSettings] = useState(defaultExhaustSettings);

  const createGame = useCallback(
    () =>
      createMeshesGame((exhaust) => {
        exhaustRef.current = exhaust;
      }),
    [],
  );

  const handleChange = (change: Partial<ExhaustSettings>): void => {
    const next = { ...settings, ...change };

    setSettings(next);

    if (exhaustRef.current) {
      applyExhaustSettings(exhaustRef.current, next);
    }
  };

  return (
    <DemoPage
      slug="meshes"
      createGame={createGame}
      panels={
        <DemoPanel title="Exhaust draw order" icon="fa-sliders">
          <DemoSettings>
            <DemoSlider
              label="World order"
              value={settings.order}
              min={-3}
              max={2}
              step={1}
              format={describeOrder}
              onChange={(order) => handleChange({ order })}
            />
            <DemoSlider
              label="Layer"
              value={settings.layer}
              min={-1}
              max={1}
              step={1}
              onChange={(layer) => handleChange({ layer })}
            />
          </DemoSettings>
        </DemoPanel>
      }
      highlights={[
        {
          text: 'The exhaust is a mesh: a geometry and a mesh material on an entity, drawn by the same render system as the sprites.',
          file: 'create-exhaust.ts',
        },
        {
          text: "Its shaders include meshVertex, which places each vertex with the entity's transform and the camera's view, and mask, which clips it like a sprite.",
          file: 'exhaust.shader.ts',
        },
        {
          text: 'The background, ship and asteroid have world orders -2, 0 and 1. The exhaust sorts among them by its layer, then its world order.',
          file: 'exhaust-settings.ts',
        },
        {
          text: 'The geometry is a triangle strip with a color per vertex, fading out towards its tip.',
          file: 'create-exhaust.ts',
        },
      ]}
      docLinks={[
        { label: 'Meshes', to: '/docs/docs/rendering/meshes' },
        { label: 'Draw order', to: '/docs/docs/rendering/draw-order' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Builds the background, ship, asteroid and exhaust, and registers the systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'The mesh',
          files: [
            {
              name: 'create-exhaust.ts',
              summary:
                'Builds the exhaust geometry and adds it to an entity with a mesh material.',
              content: exhaustCode,
            },
            {
              name: 'exhaust.shader.ts',
              summary: 'The mesh shaders the exhaust draws with.',
              content: exhaustShaderCode,
            },
            {
              name: 'exhaust-settings.ts',
              summary: "Writes the page's settings into the exhaust.",
              content: exhaustSettingsCode,
            },
          ],
        },
      ]}
    />
  );
}
