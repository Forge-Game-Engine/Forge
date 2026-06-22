import { Vector2 } from '@forge-game-engine/forge/math';
import { Color } from '@forge-game-engine/forge/rendering';
import {
  createUiPanel,
  createUiRenderable,
  createUiSlider,
  createUiText,
  destroyUiSubtree,
  getUiRenderMetrics,
  uiCanvasId,
  uiTextId,
} from '@forge-game-engine/forge/ui';
import type { SectionContext, SectionResult } from './_section-context';

const HEIGHT = 220;
const MARGIN = 16;
const GRID_HEIGHT = 90;
const CELL_SIZE = 8;
const CELL_GAP = 2;

export function createScaleSection(ctx: SectionContext): SectionResult {
  const { world, renderContext, contentEntity, contentWidth, y, font, panelRenderable } = ctx;

  const section = createUiPanel(world, {
    renderable: panelRenderable,
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(1, 0),
    offsetMin: new Vector2(MARGIN, y),
    offsetMax: new Vector2(-MARGIN, y + HEIGHT),
    parent: contentEntity,
    tintColor: Color.transparent,
    borderColor: Color.transparent,
  });

  createUiText(world, renderContext, {
    text: '6. Scale and Performance',
    font,
    fontSize: 18,
    color: Color.white,
    rect: { x: 0, y: 0, width: contentWidth - MARGIN * 2, height: 24 },
    parent: section.entity,
  });

  const gridWidth = contentWidth - MARGIN * 2;

  const gridContainer = createUiPanel(world, {
    renderable: panelRenderable,
    rect: { x: 0, y: 96, width: gridWidth, height: GRID_HEIGHT },
    parent: section.entity,
    tintColor: new Color(0.08, 0.09, 0.11, 1),
    borderColor: new Color(0.3, 0.32, 0.38, 1),
    borderWidth: 1,
    cornerRadius: 4,
    clip: true,
  });

  const cellRenderable = createUiRenderable(renderContext);
  const columns = Math.max(1, Math.floor(gridWidth / (CELL_SIZE + CELL_GAP)));
  let cellEntities: number[] = [];

  const metricsText = createUiText(world, renderContext, {
    text: '',
    font,
    fontSize: 13,
    color: new Color(0.75, 0.78, 0.85, 1),
    rect: { x: 0, y: 196, width: contentWidth - MARGIN * 2, height: 18 },
    parent: section.entity,
  });

  const rebuildGrid = (count: number): void => {
    for (const entity of cellEntities) {
      destroyUiSubtree(world, entity);
    }

    cellEntities = [];

    for (let i = 0; i < count; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const hue = (col / columns) * 360;

      const cell = createUiPanel(world, {
        renderable: cellRenderable,
        rect: {
          x: col * (CELL_SIZE + CELL_GAP),
          y: row * (CELL_SIZE + CELL_GAP),
          width: CELL_SIZE,
          height: CELL_SIZE,
        },
        parent: gridContainer.entity,
        tintColor: Color.fromHSLA(hue, 60, 55, 1),
        cornerRadius: 1,
      });

      cellEntities.push(cell.entity);
    }
  };

  createUiText(world, renderContext, {
    text: 'Element count',
    font,
    fontSize: 13,
    color: new Color(0.75, 0.78, 0.85, 1),
    rect: { x: 0, y: 36, width: 200, height: 18 },
    parent: section.entity,
  });

  const countLabel = createUiText(world, renderContext, {
    text: '60',
    font,
    fontSize: 13,
    color: new Color(0.75, 0.78, 0.85, 1),
    rect: { x: 220, y: 36, width: 60, height: 18 },
    parent: section.entity,
  });

  createUiSlider(world, {
    renderable: panelRenderable,
    fillRenderable: cellRenderable,
    knobRenderable: cellRenderable,
    rect: { x: 0, y: 60, width: 280, height: 6 },
    parent: section.entity,
    tintColor: new Color(0.3, 0.32, 0.38, 1),
    cornerRadius: 3,
    fillColor: new Color(0.25, 0.55, 0.95, 1),
    fillCornerRadius: 3,
    knobColor: Color.white,
    knobWidth: 16,
    knobHeight: 16,
    knobCornerRadius: 8,
    min: 10,
    max: 400,
    step: 10,
    value: 60,
    onChangeEnd: (event) => {
      const labelComp = world.getComponent(countLabel, uiTextId)!;

      labelComp.text = Math.round(event.value).toString();
      labelComp.dirty = true;
      rebuildGrid(Math.round(event.value));
    },
  });

  rebuildGrid(60);

  let lastUpdate = 0;

  world.addSystem({
    query: [uiCanvasId],
    run: () => {
      const now = performance.now();

      if (now - lastUpdate < 250) {
        return;
      }

      lastUpdate = now;

      const { batchCount, instanceCount } = getUiRenderMetrics();
      const metricsComp = world.getComponent(metricsText, uiTextId);

      if (metricsComp) {
        metricsComp.text = `batches: ${batchCount} | instances: ${instanceCount}`;
        metricsComp.dirty = true;
      }
    },
  });

  return { height: HEIGHT, themedRenderables: [] };
}
