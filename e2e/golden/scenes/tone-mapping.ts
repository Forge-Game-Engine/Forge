import {
  addPositionComponent,
  addSpriteComponent,
  addToneMappingComponent,
  Color,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createRenderTarget,
  createToneMapEcsSystem,
  createTransformEcsSystem,
  RENDER_TARGET_FORMAT,
  TONE_MAPPING_OPERATOR,
  TONE_MAPPING_OPERATOR_KEYS,
} from '../../../src/index.js';
import type { CreateScene, SceneHandle } from '../../fixtures/scenes/scene.js';
import {
  createGoldenCamera,
  createGoldenSceneContext,
  createGoldenSceneHandle,
} from '../golden-scene.js';

// Each row is one hue; each column doubles the brightness, from 1/8 to 16,
// so the curve's toe, shoulder and highlight rolloff all show.
const hues = [
  new Color(1, 1, 1),
  new Color(1, 0.25, 0.1),
  new Color(0.2, 1, 0.3),
  new Color(0.2, 0.4, 1),
];
const brightnesses = [0.125, 0.25, 0.5, 1, 2, 4, 8, 16];
const cellWidth = 36;
const cellHeight = 48;

/**
 * Reads the tone mapping operator from the page's `?operator=` parameter
 * (default: ACES), so one scene draws each operator's golden.
 * @returns The operator.
 */
function readOperator(): TONE_MAPPING_OPERATOR_KEYS {
  const operator = new URLSearchParams(window.location.search).get('operator');

  if (operator === null) {
    return TONE_MAPPING_OPERATOR.aces;
  }

  if (!isToneMappingOperator(operator)) {
    throw new Error(`Unknown tone mapping operator "${operator}"`);
  }

  return operator;
}

function isToneMappingOperator(
  value: string,
): value is TONE_MAPPING_OPERATOR_KEYS {
  return Object.values<string>(TONE_MAPPING_OPERATOR).includes(value);
}

/**
 * A grid of HDR colors, four hues at eight brightnesses, on an HDR camera
 * tone mapped by the operator the page names.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): SceneHandle => {
  const context = createGoldenSceneContext(container);
  const { world, renderContext } = context;

  const camera = createGoldenCamera(context, {
    clearColor: Color.black,
    renderTarget: createRenderTarget(
      renderContext,
      'canvas',
      RENDER_TARGET_FORMAT.hdr,
    ),
  });

  addToneMappingComponent(world, camera, { operator: readOperator() });

  for (const [row, hue] of hues.entries()) {
    for (const [column, brightness] of brightnesses.entries()) {
      const cell = world.createEntity();

      addPositionComponent(world, cell, {
        local: {
          x: (column - (brightnesses.length - 1) / 2) * cellWidth,
          y: ((hues.length - 1) / 2 - row) * cellHeight,
        },
      });
      addSpriteComponent(world, cell, {
        texture: renderContext.whiteTexture,
        width: cellWidth - 4,
        height: cellHeight - 4,
        tintColor: new Color(
          hue.r * brightness,
          hue.g * brightness,
          hue.b * brightness,
        ),
      });
    }
  }

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createToneMapEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return createGoldenSceneHandle(context);
};
