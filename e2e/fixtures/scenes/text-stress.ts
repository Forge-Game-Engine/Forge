import fontImageUrl from '../../../assets/fonts/default/default.png?url';
import fontMetricsUrl from '../../../assets/fonts/default/default.json?url';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  RotationEcsComponent,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import {
  Color,
  createCamera,
  createCameraEcsSystem,
  createCanvas,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
} from '../../../src/rendering/index.js';
import {
  addTextComponent,
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
  TextEcsComponent,
} from '../../../src/text/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

const verticalWorldUnits = 600;
const columnCount = 12;
const rowCount = 10;
const cellWidth = 64;
const cellHeight = 22;
const textSize = 14;

// One cell in this many shows a counter that changes every frame, as a
// score or a timer does; the rest keep their text.
const counterEvery = 10;

// How many radians the whole grid turns per second, so every text's world
// transform changes every frame.
const gridTurnSpeed = 0.05;

// Static texts cycle through these: plain text, rich text tags, and the
// outline and shadow effects, which draw through their own renderable.
const staticTexts = [
  { text: 'Forge', richText: false, effects: false },
  { text: 'Hello, world', richText: false, effects: true },
  { text: '<b>Bold</b> move', richText: true, effects: false },
  { text: '<color=#ff8800>Warm</color> glow', richText: true, effects: false },
  { text: 'Level 12', richText: false, effects: true },
  {
    text: '<color=#88ccff>Cool</color> <b>tone</b>',
    richText: true,
    effects: true,
  },
];

function addCellText(
  world: EcsWorld,
  grid: number,
  fontAtlas: FontAtlas,
  column: number,
  row: number,
): { component: TextEcsComponent; isCounter: boolean } {
  const index = row * columnCount + column;
  const entity = world.createEntity();
  const isCounter = index % counterEvery === 0;
  const style = staticTexts[index % staticTexts.length];

  addPositionComponent(world, entity, {
    local: {
      x: (column - (columnCount - 1) / 2) * cellWidth,
      y: ((rowCount - 1) / 2 - row) * cellHeight,
    },
  });
  world.setParent(entity, grid);

  const component = addTextComponent(world, entity, {
    text: isCounter ? '0' : style.text,
    fontAtlas,
    size: textSize,
    color: Color.white,
    horizontalAlign: 'center',
    richText: !isCounter && style.richText,
    outlineWidth: !isCounter && style.effects ? 0.1 : 0,
    outlineColor: Color.black,
  });

  return { component, isCounter };
}

/** The text stress scene's handle. */
export interface TextStressSceneHandle extends SceneHandle {
  /** How many text entities the scene draws. */
  readonly textCount: number;
  /** How many of them change their text every frame. */
  readonly counterCount: number;
}

/**
 * A grid of text entities in the default font, slowly turning as one
 * hierarchy: plain text, rich text and text with an outline, plus one cell
 * in ten showing a counter that changes every frame and so is shaped again
 * every frame.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<TextStressSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas);

  createCamera(world, {
    isStatic: true,
    clearColor: new Color(0.08, 0.1, 0.14, 1),
    verticalWorldUnits,
  });

  const fontAtlas = await new FontAtlasCache(renderContext).getOrLoad({
    metricsUrl: fontMetricsUrl,
    imageUrl: fontImageUrl,
  });

  const grid = world.createEntity();

  addPositionComponent(world, grid);

  const gridRotation: RotationEcsComponent = addRotationComponent(world, grid);
  const counters: TextEcsComponent[] = [];
  let textCount = 0;

  for (let row = 0; row < rowCount; row++) {
    for (let column = 0; column < columnCount; column++) {
      const { component, isCounter } = addCellText(
        world,
        grid,
        fontAtlas,
        column,
        row,
      );

      textCount++;

      if (isCounter) {
        counters.push(component);
      }
    }
  }

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;
  let frame = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);

      gridRotation.local = (gridTurnSpeed * clockInMilliseconds) / 1000;
      frame++;

      for (let i = 0; i < counters.length; i++) {
        counters[i].text = String(frame + i);
      }

      world.update();
    },

    textCount,
    counterCount: counters.length,
  };
};
