import {
  addPositionComponent,
  addSpriteComponent,
  addToneMappingComponent,
  Color,
  createCamera,
  createCanvas,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createRenderTarget,
  createToneMapEcsSystem,
  createTransformEcsSystem,
  EcsWorld,
  RENDER_TARGET_FORMAT,
  Time,
  TONE_MAPPING_OPERATOR,
  TONE_MAPPING_OPERATOR_KEYS,
} from '../../../src/index.js';
import type { CreateScene, SceneHandle } from './scene.js';
import {
  toneCurveBrightnesses,
  toneCurveCellCenter,
  toneCurveExposure,
} from './tone-curve-cells.js';

const defaultStepDeltaMilliseconds = 16.6666;

const canvasSize = { width: 480, height: 80 };

function isToneMappingOperator(
  value: string,
): value is TONE_MAPPING_OPERATOR_KEYS {
  return Object.values<string>(TONE_MAPPING_OPERATOR).includes(value);
}

/**
 * Reads the operator from the page's `?operator=` parameter.
 * @returns The operator.
 * @throws An error if the parameter is missing or names no operator.
 */
function readOperator(): TONE_MAPPING_OPERATOR_KEYS {
  const operator = new URLSearchParams(window.location.search).get('operator');

  if (operator === null || !isToneMappingOperator(operator)) {
    throw new Error(
      `The tone-curve scene needs ?operator= set to one of ${Object.values(TONE_MAPPING_OPERATOR).join(', ')}.`,
    );
  }

  return operator;
}

/**
 * A row of grey cells with known HDR values, each filling its slice of the
 * canvas, on an HDR camera tone mapped at a fixed exposure by the operator
 * the page names. With no blending between cells, each cell's center is
 * the operator's curve at that cell's exposed value, which
 * `tone-curve.spec.ts` computes and compares.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): SceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(
    container,
    'forge-canvas',
    canvasSize.width,
    canvasSize.height,
  );

  // The spec samples the canvas in its own `page.evaluate`, after the frame
  // was presented.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const camera = createCamera(world, {
    isStatic: true,
    clearColor: Color.black,
    verticalWorldUnits: renderContext.cssHeight,
    renderTarget: createRenderTarget(
      renderContext,
      'canvas',
      RENDER_TARGET_FORMAT.hdr,
    ),
  });

  addToneMappingComponent(world, camera, {
    operator: readOperator(),
    exposure: toneCurveExposure,
  });

  const cellWidth = canvasSize.width / toneCurveBrightnesses.length;

  for (const [index, brightness] of toneCurveBrightnesses.entries()) {
    const cell = world.createEntity();

    addPositionComponent(world, cell, {
      local: {
        x: (toneCurveCellCenter(index) - 0.5) * canvasSize.width,
        y: 0,
      },
    });
    addSpriteComponent(world, cell, {
      texture: renderContext.whiteTexture,
      width: cellWidth,
      height: canvasSize.height,
      tintColor: new Color(brightness, brightness, brightness),
    });
  }

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createToneMapEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },
  };
};
