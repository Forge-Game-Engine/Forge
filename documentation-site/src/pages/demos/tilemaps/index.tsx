import React, { JSX, useCallback, useRef, useState } from 'react';
import { createTilemapsGame, MapKind, TilemapsDemo } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createInputsCode from '!!raw-loader!./_create-inputs';
import orthogonalMapCode from '!!raw-loader!./_orthogonal-map';
import isometricMapCode from '!!raw-loader!./_isometric-map';
import tileSheetsCode from '!!raw-loader!./_tile-sheets';
import demoMapCode from '!!raw-loader!./_demo-map';
import tileEditorComponentCode from '!!raw-loader!./_tile-editor.component';
import tileEditorSystemCode from '!!raw-loader!./_tile-editor.system';
import walkerComponentCode from '!!raw-loader!./_walker.component';
import walkSystemCode from '!!raw-loader!./_walk.system';

import {
  DemoChoice,
  DemoPage,
  DemoPanel,
  DemoSettings,
} from '@site/src/components/demo-page';
import { showMap } from './_demo-map';
import type { HoveredCell } from './_tile-editor.component';
import styles from './_HoveredCell.module.css';

const mapOptions: readonly { value: MapKind; label: string }[] = [
  { value: 'orthogonal', label: 'Orthogonal' },
  { value: 'isometric', label: 'Isometric' },
];

const HoveredCellReadout = ({
  cell,
}: {
  cell: HoveredCell | null;
}): JSX.Element => {
  if (!cell) {
    return <p className={styles.empty}>Move the mouse over the map.</p>;
  }

  return (
    <>
      <p className={styles.cell}>
        Column {cell.column}, row {cell.row}
      </p>
      {cell.tiles.length === 0 ? (
        <p className={styles.empty}>Every layer is empty here.</p>
      ) : (
        <ul className={styles.tiles}>
          {cell.tiles.map(({ layer, properties }) => (
            <li key={layer}>
              <span className={styles.layer}>{layer} layer</span>
              <dl className={styles.properties}>
                {Object.entries(properties).map(([name, value]) => (
                  <React.Fragment key={name}>
                    <dt>{name}</dt>
                    <dd>{String(value)}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export default function Tilemaps(): JSX.Element {
  const demoRef = useRef<TilemapsDemo | null>(null);
  const [mapKind, setMapKind] = useState<MapKind>('orthogonal');
  const [brushNames, setBrushNames] = useState<readonly string[]>([]);
  const [brushName, setBrushName] = useState('');
  const [hovered, setHovered] = useState<HoveredCell | null>(null);

  const showBrushes = (demo: TilemapsDemo, kind: MapKind): void => {
    const names = demo.maps[kind].brushes.map(({ name }) => name);

    setBrushNames(names);
    setBrushName(names[0]);
  };

  const createGame = useCallback(
    () =>
      createTilemapsGame((demo) => {
        demoRef.current = demo;
        demo.editor.hoveredChanged.registerListener(setHovered);
        showBrushes(demo, 'orthogonal');
      }),
    [],
  );

  const handleMapChange = (kind: MapKind): void => {
    setMapKind(kind);

    const demo = demoRef.current;

    if (demo) {
      showMap(demo.editor, Object.values(demo.maps), demo.maps[kind]);
      showBrushes(demo, kind);
    }
  };

  const handleBrushChange = (name: string): void => {
    setBrushName(name);

    const demo = demoRef.current;
    const brush = demo?.maps[mapKind].brushes.find(
      (candidate) => candidate.name === name,
    );

    if (demo && brush) {
      demo.editor.brush = brush;
    }
  };

  return (
    <DemoPage
      slug="tilemaps"
      createGame={createGame}
      controls={[
        {
          inputs: ['WASD', '↑↓←→'],
          action: 'Walk',
          detail:
            'On the orthogonal map. Paths are fast, sand is slow, and water stops you',
        },
        {
          inputs: [{ device: 'mouse', label: 'Left button' }],
          action: 'Paint the brush tile',
          detail: 'Hold and drag to paint a stroke',
        },
        {
          inputs: [{ device: 'mouse', label: 'Right button' }],
          action: 'Erase the top tile',
          detail: 'Hold and drag to erase a stroke',
        },
      ]}
      panels={
        <>
          <DemoPanel title="Map" icon="fa-map">
            <DemoSettings>
              <DemoChoice
                label="Layout"
                value={mapKind}
                options={mapOptions}
                onChange={handleMapChange}
              />
              {brushNames.length > 0 && (
                <DemoChoice
                  label="Brush"
                  value={brushName}
                  options={brushNames.map((name) => ({
                    value: name,
                    label: name,
                  }))}
                  onChange={handleBrushChange}
                />
              )}
            </DemoSettings>
          </DemoPanel>
          <DemoPanel title="Cell under the mouse" icon="fa-arrow-pointer">
            <HoveredCellReadout cell={hovered} />
          </DemoPanel>
        </>
      }
      highlights={[
        {
          text: 'Each map layer is one entity holding its tiles as data. The tilemap render system draws it as one mesh per 32 x 32 chunk and tileset source.',
          file: 'orthogonal-map.ts',
        },
        {
          text: "The character is a child of the ground layer, so it draws after the ground's tiles and before the cover layer, the ground's next sibling.",
          file: 'orthogonal-map.ts',
        },
        {
          text: 'The isometric walls are taller than their cells, and the layer draws its cells back to front, so nearer walls cover the ones behind.',
          file: 'isometric-map.ts',
        },
        {
          text: 'worldToCell turns the mouse into a cell, where setTile and clearTile paint and erase, and the next frame rebuilds only that chunk.',
          file: 'tile-editor.system.ts',
        },
        {
          text: 'The tile set gives each tile properties, which the readout lists and the walker reads for its speed and where it can go.',
          file: 'walk.system.ts',
        },
      ]}
      docLinks={[
        { label: 'Tilemaps', to: '/docs/docs/tilemaps' },
        { label: 'Grid layouts', to: '/docs/docs/math/grid-layouts' },
        { label: 'Draw order', to: '/docs/docs/rendering/draw-order' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Builds both maps and the tile editor, and registers the systems in order.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Maps',
          files: [
            {
              name: 'orthogonal-map.ts',
              summary:
                'The orthogonal tile set, its ground and cover layers, the character and the cursor.',
              content: orthogonalMapCode,
            },
            {
              name: 'isometric-map.ts',
              summary:
                'The isometric tile set with tiles taller than a cell, and its one layer of floors, hedges and walls.',
              content: isometricMapCode,
            },
            {
              name: 'tile-sheets.ts',
              summary:
                'Draws both tile sheets, the cursors and the character on canvases at runtime.',
              content: tileSheetsCode,
            },
            {
              name: 'demo-map.ts',
              summary:
                'Shows one map, hides the other, and points the editor at the shown one.',
              content: demoMapCode,
            },
          ],
        },
        {
          title: 'Editing',
          files: [
            {
              name: 'tile-editor.component.ts',
              summary:
                'The layers being edited, the brush, the cursor and the cell under the mouse.',
              content: tileEditorComponentCode,
            },
            {
              name: 'tile-editor.system.ts',
              summary:
                'Paints, erases and reads the cell under the mouse, and moves the cursor onto it.',
              content: tileEditorSystemCode,
            },
            {
              name: 'create-inputs.ts',
              summary:
                'Binds the keys to walking and the mouse buttons to painting and erasing.',
              content: createInputsCode,
            },
          ],
        },
        {
          title: 'Walking',
          files: [
            {
              name: 'walker.component.ts',
              summary: 'The layer an entity walks on, and its walking speed.',
              content: walkerComponentCode,
            },
            {
              name: 'walk.system.ts',
              summary:
                "Walks the character over the ground layer, reading each tile's speed and whether it can be walked on.",
              content: walkSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
