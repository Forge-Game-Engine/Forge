import {
  addPositionComponent,
  addSpriteComponent,
  Color,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createTransformEcsSystem,
} from '../../../src/index.js';
import type { CreateScene, SceneHandle } from '../../fixtures/scenes/scene.js';
import {
  createGoldenCamera,
  createGoldenSceneContext,
  createGoldenSceneHandle,
} from '../golden-scene.js';
import { canaryColors, canaryQuadSize, Rgb8 } from '../canary-colors.js';

const toColor = ({ r, g, b }: Rgb8): Color =>
  new Color(r / 255, g / 255, b / 255, 1);

/** The canary's handle: the renderer string, besides `step()`. */
export interface CanarySceneHandle extends SceneHandle {
  /** The WebGL renderer the browser reports, e.g. one naming SwiftShader. */
  readonly renderer: string;
}

/**
 * The simplest frame the engine can draw: a clear and one opaque, untextured
 * quad in the middle. If this doesn't match its golden, the rendering
 * environment is wrong, not the change under test.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): CanarySceneHandle => {
  const context = createGoldenSceneContext(container);
  const { world, renderContext } = context;

  createGoldenCamera(context, { clearColor: toColor(canaryColors.clear) });

  const quad = world.createEntity();

  addPositionComponent(world, quad);
  addSpriteComponent(world, quad, {
    texture: renderContext.whiteTexture,
    width: canaryQuadSize.width,
    height: canaryQuadSize.height,
    tintColor: toColor(canaryColors.quad),
  });

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  const { gl } = renderContext;

  // `RENDERER` itself only says "WebKit WebGL"; the unmasked string names
  // the rasterizer actually behind the context.
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo
    ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
    : String(gl.getParameter(gl.RENDERER));

  return { ...createGoldenSceneHandle(context), renderer };
};
