import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import { MouseInputSource, registerInputs } from '../../../src/input/index.js';
import {
  addCameraComponent,
  Color,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
} from '../../../src/rendering/index.js';
import {
  addUiInteractableComponent,
  createPanel,
  createScrollView,
  createUiCanvas,
  registerUiSystems,
  UiAnchor,
  uiScaleModes,
} from '../../../src/ui/index.js';
import { PixelBounds, scanPixelBounds } from './input-scene-helpers.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

const worldRenderCategory = 1 << 0;
const uiRenderCategory = 1 << 1;

const itemCount = 10;
const itemHeight = 60;
const landmarkIndex = 4;

/** The scroll view's center, in CSS pixels from the canvas's top-left. */
const viewportCenter = { x: 400, y: 300 };
const viewportSize = 300;

/** The handle `ui-scroll-view.spec.ts` drives and asserts against. */
export interface UiScrollViewSceneHandle extends SceneHandle {
  /** The scroll rect's vertical offset, in reference (here CSS) pixels. */
  readonly offsetY: number;

  /** How many times the landmark item was invoked. */
  readonly landmarkInvokeCount: number;

  /** The viewport's center, in page CSS pixels. */
  readonly viewportCenter: { x: number; y: number };

  /** The viewport's top edge, in canvas pixels. */
  readonly viewportTop: number;

  /**
   * The on-screen bounds of the magenta landmark item, from the rendered
   * canvas, or `null` when none of it is drawn. Must be called in the same
   * `page.evaluate` task as the preceding `step()`.
   */
  measureLandmark(): PixelBounds | null;
}

/**
 * Builds a screen-space UI canvas (1 reference pixel per CSS pixel) with a
 * 300x300 scroll view in the middle, listing ten 60-pixel-tall items: the
 * fifth is magenta, the rest gray. The list is 600 pixels tall, so it
 * scrolls 300.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): UiScrollViewSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);

  canvas.width = 800;
  canvas.height = 600;

  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });
  const inputManager = registerInputs(world, time, {});
  const mouseInputSource = new MouseInputSource(inputManager, container);

  const worldCameraEntity = world.createEntity();

  addPositionComponent(world, worldCameraEntity);
  addCameraComponent(world, worldCameraEntity, {
    isStatic: true,
    clearColor: new Color(0.8, 0.8, 0.8, 1),
    cullingMask: worldRenderCategory,
  });

  registerUiSystems(world, renderContext, time, {
    pointerSource: mouseInputSource,
  });

  const uiCanvas = createUiCanvas(world, renderContext, {
    cullingMask: uiRenderCategory,
    scaleMode: uiScaleModes.constantPixelSize,
  });

  const sprite = (tint: Color) => ({
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: uiRenderCategory,
    tintColor: tint,
  });

  const scrollView = createScrollView(world, uiCanvas, {
    anchor: UiAnchor.center({ x: viewportSize, y: viewportSize }),
    sprite: sprite(new Color(0.2, 0.2, 0.25, 1)),
  });

  let landmarkInvokeCount = 0;

  for (let i = 0; i < itemCount; i++) {
    const isLandmark = i === landmarkIndex;
    const item = createPanel(world, scrollView.content, {
      sprite: sprite(
        isLandmark ? new Color(1, 0, 1, 1) : new Color(0.5, 0.5, 0.5, 1),
      ),
      anchor: UiAnchor.center({ x: viewportSize, y: itemHeight }),
    });
    const interactable = addUiInteractableComponent(world, item);

    if (isLandmark) {
      interactable.onInvoke.registerListener(() => landmarkInvokeCount++);
    }
  }

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    get offsetY(): number {
      return scrollView.scrollRect.offset.y;
    },

    get landmarkInvokeCount(): number {
      return landmarkInvokeCount;
    },

    get viewportCenter(): { x: number; y: number } {
      const bounds = canvas.getBoundingClientRect();

      return {
        x: bounds.left + viewportCenter.x,
        y: bounds.top + viewportCenter.y,
      };
    },

    get viewportTop(): number {
      return viewportCenter.y - viewportSize / 2;
    },

    measureLandmark(): PixelBounds | null {
      return scanPixelBounds(canvas, (r, g, b) => r > 200 && g < 60 && b > 200);
    },
  };
};
