import fontImageUrl from '../../../assets/fonts/default/default.png?url';
import fontMetricsUrl from '../../../assets/fonts/default/default.json?url';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  addTextComponent,
  Color,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createTextShapingEcsSystem,
  createTransformEcsSystem,
  FontAtlas,
  FontAtlasCache,
  TextEcsComponent,
  Vector2,
} from '../../../src/index.js';
import type { CreateScene, SceneHandle } from '../../fixtures/scenes/scene.js';
import {
  createGoldenCamera,
  createGoldenSceneContext,
  createGoldenSceneHandle,
  GoldenSceneContext,
} from '../golden-scene.js';

interface TextLine {
  position: Vector2;
  options: Partial<TextEcsComponent> & { text: string };
  rotation?: number;
  scale?: Vector2;
}

/**
 * Adds one centered line of text.
 * @param context - The scene's context.
 * @param fontAtlas - The font to draw it with.
 * @param line - Where and how to draw it.
 */
function addLine(
  context: GoldenSceneContext,
  fontAtlas: FontAtlas,
  line: TextLine,
): void {
  const { world } = context;
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: line.position });
  addRotationComponent(world, entity, { local: line.rotation ?? 0 });
  addScaleComponent(world, entity, { local: line.scale ?? { x: 1, y: 1 } });
  addTextComponent(world, entity, {
    fontAtlas,
    size: 24,
    color: Color.white,
    // Centered on the entity: a box as wide as the canvas, pivoted at its
    // middle.
    maxWidth: 320,
    horizontalAlign: 'center',
    horizontalAlignPivot: 0.5,
    verticalAlign: 'middle',
    ...line.options,
  });
}

/**
 * Text in the engine's default font (whose atlas image has no color-space
 * chunks, so it uploads the same however images are decoded): plain, with
 * an outline, with a soft shadow, rotated and scaled, and with rich-text
 * color and bold tags.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<SceneHandle> => {
  const context = createGoldenSceneContext(container);
  const { world, renderContext } = context;

  createGoldenCamera(context, { clearColor: new Color(0.1, 0.14, 0.22) });

  const fontAtlas = await new FontAtlasCache(renderContext).getOrLoad({
    metricsUrl: fontMetricsUrl,
    imageUrl: fontImageUrl,
  });

  const lines: TextLine[] = [
    { position: { x: 0, y: 92 }, options: { text: 'Forge golden text' } },
    {
      position: { x: 0, y: 52 },
      options: {
        text: 'Outlined',
        color: new Color(1, 0.85, 0.2),
        outlineColor: new Color(0.6, 0.1, 0.1),
        outlineWidth: 2,
      },
    },
    {
      position: { x: 0, y: 12 },
      options: {
        text: 'Soft shadow',
        shadowColor: new Color(0, 0, 0, 0.8),
        shadowOffset: { x: 2, y: -2 },
        shadowSoftness: 2,
      },
    },
    {
      position: { x: 0, y: -38 },
      options: { text: 'Rotated', color: new Color(0.5, 0.9, 1) },
      rotation: Math.PI / 12,
      scale: { x: 1.5, y: 1 },
    },
    {
      position: { x: 0, y: -92 },
      options: {
        text: 'Rich <color=#ff6040>color</color> and <b>bold</b>',
        size: 20,
        richText: true,
      },
    },
  ];

  for (const line of lines) {
    addLine(context, fontAtlas, line);
  }

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return createGoldenSceneHandle(context);
};
