import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import {
  addCameraComponent,
  addVisibilityComponent,
  Color,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
} from '../../../src/rendering/index.js';
import {
  addVerticalLayoutGroupComponent,
  createPanel,
  createUiCanvas,
  registerUiSystems,
  uiAlignments,
  UiAnchor,
} from '../../../src/ui/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

const worldRenderCategory = 1 << 0;
const uiRenderCategory = 1 << 1;

/** Which of the scene's sprites a sampled pixel shows, by its color. */
type SampledSprite = 'red' | 'green' | 'blue' | 'menu' | 'background';

/** A run of rows, top to bottom in canvas pixels, that showed one sprite. */
export interface VerticalExtent {
  top: number;
  bottom: number;
}

/** What `hierarchical-visibility.spec.ts` asserts against, from one frame. */
export interface HierarchicalVisibilityMeasurement {
  /** Each sprite's rows down the canvas's center column, or `null` if none showed it. */
  extents: Record<SampledSprite, VerticalExtent | null>;

  /** The middle (green) row's own `visible`, read back from the ECS. */
  greenVisible: boolean;

  /** The menu's own `visible`, read back from the ECS. */
  menuVisible: boolean;
}

/** The handle `hierarchical-visibility.spec.ts` drives and asserts against. */
export interface HierarchicalVisibilitySceneHandle extends SceneHandle {
  /** Sets the green row's `VisibilityEcsComponent.visible`. */
  setGreenVisible(visible: boolean): void;

  /** Sets the menu panel's `VisibilityEcsComponent.visible`. */
  setMenuVisible(visible: boolean): void;

  /**
   * Scans the canvas's displayed bitmap down its center column. Must be
   * called in the same `page.evaluate` task as the preceding `step()`.
   */
  measure(): HierarchicalVisibilityMeasurement;
}

const classify = (r: number, g: number, b: number): SampledSprite => {
  if (r > 200 && g > 200 && b > 200) {
    return 'background';
  }

  if (r > 150 && g < 100 && b < 100) {
    return 'red';
  }

  if (g > 150 && r < 100 && b < 100) {
    return 'green';
  }

  if (b > 150 && r < 100 && g < 100) {
    return 'blue';
  }

  return 'menu';
};

/**
 * Builds a minimal scene for hierarchical visibility: a grey menu panel on
 * a white world background, whose vertical layout group stacks a red, a
 * green and a blue row from the top. Hiding the green row should close
 * its gap (the blue row moves up to where the green one was), and hiding
 * the menu should remove the panel and every row from the frame.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): HierarchicalVisibilitySceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);

  canvas.width = 800;
  canvas.height = 600;

  // See `measureGreenSquareBounds` in `camera-pan-zoom.ts` for why this is
  // required for a reliable same-run pixel readback.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const worldCamera = world.createEntity();

  addPositionComponent(world, worldCamera);
  addCameraComponent(world, worldCamera, {
    isStatic: true,
    clearColor: Color.white,
    cullingMask: worldRenderCategory,
  });

  registerUiSystems(world, renderContext, time);

  const uiCanvas = createUiCanvas(world, renderContext, {
    cullingMask: uiRenderCategory,
    referenceResolution: { x: canvas.width, y: canvas.height },
  });

  const solidSprite = (color: Color) => ({
    ...createImageSprite(renderContext.whiteTexture),
    category: uiRenderCategory,
    tintColor: color,
  });

  const menu = createPanel(world, uiCanvas, {
    sprite: solidSprite(new Color(0.3, 0.3, 0.3, 1)),
    anchor: UiAnchor.center({ x: 240, y: 440 }),
  });

  addVerticalLayoutGroupComponent(world, menu, {
    padding: { left: 20, right: 20, top: 20, bottom: 20 },
    spacing: 20,
    childAlignment: uiAlignments.topCenter,
    childForceExpandHeight: false,
  });

  const rowColors = [
    new Color(1, 0, 0, 1),
    new Color(0, 1, 0, 1),
    new Color(0, 0, 1, 1),
  ];
  const rows = rowColors.map((color) =>
    createPanel(world, menu, {
      sprite: solidSprite(color),
      anchor: UiAnchor.center({ x: 160, y: 80 }),
    }),
  );

  const menuVisibility = addVisibilityComponent(world, menu);
  const greenVisibility = addVisibilityComponent(world, rows[1]);

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

    setGreenVisible(visible: boolean): void {
      greenVisibility.visible = visible;
    },

    setMenuVisible(visible: boolean): void {
      menuVisibility.visible = visible;
    },

    measure(): HierarchicalVisibilityMeasurement {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const { data } = context2d.getImageData(
        Math.round(canvas.width / 2),
        0,
        1,
        canvas.height,
      );
      const extents: Record<SampledSprite, VerticalExtent | null> = {
        red: null,
        green: null,
        blue: null,
        menu: null,
        background: null,
      };

      for (let y = 0; y < canvas.height; y++) {
        const sprite = classify(data[y * 4], data[y * 4 + 1], data[y * 4 + 2]);
        const extent = extents[sprite];

        if (extent) {
          extent.bottom = y;
        } else {
          extents[sprite] = { top: y, bottom: y };
        }
      }

      return {
        extents,
        greenVisible: greenVisibility.visible,
        menuVisible: menuVisibility.visible,
      };
    },
  };
};
