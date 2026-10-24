import React, { JSX, useCallback, useRef, useState } from 'react';
import { createPathFindingGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createLevelCode from '!!raw-loader!./_create-level';
import createUnitsCode from '!!raw-loader!./_create-units';
import createInputsCode from '!!raw-loader!./_create-inputs';
import levelComponentCode from '!!raw-loader!./_level.component';
import bakeGridSystemCode from '!!raw-loader!./_bake-grid.system';
import applyVelocitySystemCode from '!!raw-loader!./_apply-velocity.system';
import pointerSystemCode from '!!raw-loader!./_pointer.system';
import viewComponentCode from '!!raw-loader!./_path-finding-view.component';
import gridOverlaySystemCode from '!!raw-loader!./_grid-overlay.system';
import unitPathLinesComponentCode from '!!raw-loader!./_unit-path-lines.component';
import pathLinesSystemCode from '!!raw-loader!./_path-lines.system';

import {
  DemoLegend,
  DemoPage,
  DemoPanel,
  DemoSettings,
  DemoToggle,
} from '@site/src/components/demo-page';
import {
  applyPathFindingViewSettings,
  defaultPathFindingViewSettings,
  PathFindingViewEcsComponent,
  PathFindingViewSettings,
} from './_path-finding-view.component';

/** A legend marker: a square, or a line as thick as `height`. */
const swatch = (color: string, height: number): JSX.Element => (
  <span style={{ width: 16, height, backgroundColor: color }} />
);

export default function PathFinding(): JSX.Element {
  const viewRef = useRef<PathFindingViewEcsComponent | null>(null);
  const [settings, setSettings] = useState(defaultPathFindingViewSettings);

  const createGame = useCallback(
    () =>
      createPathFindingGame((view) => {
        viewRef.current = view;
      }),
    [],
  );

  const handleChange = (change: Partial<PathFindingViewSettings>): void => {
    const next = { ...settings, ...change };

    setSettings(next);

    if (viewRef.current) {
      applyPathFindingViewSettings(viewRef.current, next);
    }
  };

  return (
    <DemoPage
      slug="path-finding"
      createGame={createGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Click' }],
          action: 'Send the units',
          detail: 'Each unit walks to its own open cell nearest the click',
        },
        {
          inputs: [{ device: 'mouse', label: 'Drag' }],
          action: 'Move a wall',
          detail:
            'Drag one of the blue walls. It moves a cell at a time, and not onto a unit',
        },
      ]}
      panels={
        <>
          <DemoPanel title="Show" icon="fa-sliders">
            <DemoSettings>
              <DemoToggle
                label="Blocked cells"
                checked={settings.showBlockedCells}
                onChange={(showBlockedCells) =>
                  handleChange({ showBlockedCells })
                }
              />
              <DemoToggle
                label="Raw paths"
                checked={settings.showRawPaths}
                onChange={(showRawPaths) => handleChange({ showRawPaths })}
              />
              <DemoToggle
                label="Smoothed paths"
                checked={settings.showSmoothedPaths}
                onChange={(showSmoothedPaths) =>
                  handleChange({ showSmoothedPaths })
                }
              />
            </DemoSettings>
          </DemoPanel>
          <DemoPanel title="Legend" icon="fa-list">
            <DemoLegend
              items={[
                {
                  marker: swatch('rgba(230, 64, 77, 0.6)', 14),
                  label: 'Blocked cell',
                },
                {
                  marker: swatch('rgb(150, 150, 150)', 2),
                  label: 'Raw path, through cell centres',
                },
                {
                  marker: swatch('rgb(255, 191, 64)', 3),
                  label: "Smoothed path, in its unit's color",
                },
                {
                  marker: swatch('rgb(115, 133, 168)', 14),
                  label: 'Wall you can drag',
                },
              ]}
            />
          </DemoPanel>
        </>
      }
      highlights={[
        {
          text: 'The walls are static colliders. markGridFromColliders blocks every cell they cover, and every cell within a unit’s radius of them, so a unit walking the open cells never scrapes a wall.',
          file: 'bake-grid.system.ts',
        },
        {
          text: 'Each unit has a navigation agent that plans with a grid path planner. Clicking sets every agent’s target, and the agent system plans the paths within a per-frame search budget.',
          file: 'pointer.system.ts',
        },
        {
          text: 'The planner smooths each path: from the cell centres the search found, it keeps only the corners a unit can’t walk straight past.',
          file: 'path-lines.system.ts',
        },
        {
          text: 'The agents don’t move the units. A system copies each agent’s desiredVelocity into its rigid body, and physics moves the units and pushes them apart.',
          file: 'apply-velocity.system.ts',
        },
        {
          text: 'Moving a wall bakes the grid again. That raises the grid’s version, and every agent plans a new path on the same tick.',
          file: 'create-game.ts',
        },
      ]}
      docLinks={[
        { label: 'Navigation', to: '/docs/docs/navigation' },
        { label: 'Navigation grids', to: '/docs/docs/navigation/grids' },
        {
          label: 'Blocking cells from colliders',
          to: '/docs/docs/navigation/colliders',
        },
        { label: 'Navigation agents', to: '/docs/docs/navigation/agents' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Creates the camera, the level and its grid, the shared path planner and the units, and registers the systems in order.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Navigation',
          files: [
            {
              name: 'create-level.ts',
              summary:
                'Creates the navigation grid, the border, the draggable walls as static colliders, and a hidden square over every cell.',
              content: createLevelCode,
            },
            {
              name: 'level.component.ts',
              summary:
                'The grid, the units, the wall being dragged, and the versions that decide when the grid is baked again.',
              content: levelComponentCode,
            },
            {
              name: 'bake-grid.system.ts',
              summary:
                'Opens every cell and blocks the ones the walls cover, with the units’ radius as the agent radius, whenever a wall has moved.',
              content: bakeGridSystemCode,
            },
            {
              name: 'create-units.ts',
              summary:
                'Creates each unit with a circle collider, a dynamic rigid body and a navigation agent.',
              content: createUnitsCode,
            },
            {
              name: 'apply-velocity.system.ts',
              summary:
                'Copies each agent’s desiredVelocity into its unit’s rigid body.',
              content: applyVelocitySystemCode,
            },
          ],
        },
        {
          title: 'Mouse',
          files: [
            {
              name: 'pointer.system.ts',
              summary:
                'Sets the units’ targets to the open cells nearest a click, or drags the clicked wall a cell at a time.',
              content: pointerSystemCode,
            },
            {
              name: 'create-inputs.ts',
              summary:
                'Binds pressing and holding the left mouse button to two actions.',
              content: createInputsCode,
            },
          ],
        },
        {
          title: 'Drawing',
          files: [
            {
              name: 'path-finding-view.component.ts',
              summary:
                'What the panel turns on and off, and what the overlay last drew.',
              content: viewComponentCode,
            },
            {
              name: 'grid-overlay.system.ts',
              summary:
                'Shows a red square over each blocked cell when the grid changes.',
              content: gridOverlaySystemCode,
            },
            {
              name: 'unit-path-lines.component.ts',
              summary:
                'The line segments drawn along one unit’s raw and smoothed paths.',
              content: unitPathLinesComponentCode,
            },
            {
              name: 'path-lines.system.ts',
              summary:
                'Draws each unit’s smoothed path, and its raw path found again with findGridPath.',
              content: pathLinesSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
