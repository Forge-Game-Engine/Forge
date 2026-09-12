/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerUiSystems } from './register-ui-systems.js';
import { createUiCanvas } from './create-ui-canvas.js';
import {
  addParentComponent,
  addPositionComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { MouseInputSource } from '../../input/index.js';
import {
  addCameraComponent,
  cameraId,
  RenderContext,
} from '../../rendering/index.js';
import { canvasId } from '../components/canvas-component.js';
import {
  addRectTransformComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import {
  addUiInteractableComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';
import { addUiSafeAreaComponent } from '../components/ui-safe-area-component.js';
import { UiAnchor } from '../types/ui-anchor.js';
import { uiCanvasRenderModes } from '../types/ui-canvas-render-mode.js';

const buildMouseInputSource = (x = 0, y = 0): MouseInputSource =>
  ({
    position: { x, y },
    buttonsDown: new Set(),
    buttonsUp: new Set(),
  }) as unknown as MouseInputSource;

const testCullingMask = 0b0001;

describe('registerUiSystems', () => {
  let gl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let world: EcsWorld;
  let time: Time;

  beforeEach(() => {
    gl = {
      createFramebuffer: vi.fn().mockReturnValue({}),
      createTexture: vi.fn().mockReturnValue({}),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      checkFramebufferStatus: vi.fn().mockReturnValue(1),
      getParameter: vi.fn().mockReturnValue(null),
      deleteFramebuffer: vi.fn(),
      deleteTexture: vi.fn(),
      getExtension: vi.fn().mockReturnValue({}),
      FRAMEBUFFER: 'FRAMEBUFFER',
      FRAMEBUFFER_BINDING: 'FRAMEBUFFER_BINDING',
      FRAMEBUFFER_COMPLETE: 1,
      COLOR_ATTACHMENT0: 'COLOR_ATTACHMENT0',
      TEXTURE_2D: 'TEXTURE_2D',
      RGBA16F: 'RGBA16F',
      HALF_FLOAT: 'HALF_FLOAT',
    } as unknown as WebGL2RenderingContext;

    renderContext = { width: 1920, height: 1080, gl } as RenderContext;
    world = new EcsWorld();
    time = new Time();
  });

  it('does not throw when called without options', () => {
    expect(() => registerUiSystems(world, renderContext, time)).not.toThrow();
  });

  it('resolves every canvas registered with the world in a single update', () => {
    registerUiSystems(world, renderContext, time);

    const canvasA = createUiCanvas(world, renderContext, {
      cullingMask: testCullingMask,
    });
    const canvasB = createUiCanvas(world, renderContext, {
      cullingMask: testCullingMask,
      referenceResolution: { x: 1280, y: 720 },
    });

    world.update();

    expect(world.getComponentRequired(canvasA, rectTransformId).rect).toEqual({
      min: { x: -960, y: -540 },
      max: { x: 960, y: 540 },
    });
    expect(world.getComponentRequired(canvasB, rectTransformId).rect).toEqual({
      min: { x: -640, y: -360 },
      max: { x: 640, y: 360 },
    });
  });

  it('resolves a worldSpace canvas root as an ordinary anchored rect, not the render destination size, and never touches the given camera', () => {
    registerUiSystems(world, renderContext, time);

    const worldCamera = world.createEntity();

    addPositionComponent(world, worldCamera);
    addCameraComponent(world, worldCamera, {
      cullingMask: testCullingMask,
      verticalWorldUnits: 12,
    });

    const canvas = createUiCanvas(world, renderContext, {
      renderMode: uiCanvasRenderModes.worldSpace,
      camera: worldCamera,
      anchor: UiAnchor.center({ x: 4, y: 1 }),
      anchoredPosition: { x: 10, y: -5 },
    });

    world.update();

    expect(world.getComponentRequired(canvas, rectTransformId).rect).toEqual({
      min: { x: 8, y: -5.5 },
      max: { x: 12, y: -4.5 },
    });
    expect(
      world.getComponentRequired(worldCamera, cameraId).verticalWorldUnits,
    ).toBe(12);
  });

  it('wires the safe-area system before layout when getSafeAreaInsets is supplied', () => {
    registerUiSystems(world, renderContext, time, {
      getSafeAreaInsets: () => ({ top: 40, right: 0, bottom: 0, left: 0 }),
    });

    const canvas = createUiCanvas(world, renderContext, {
      cullingMask: testCullingMask,
    });

    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addParentComponent(world, entity, { parent: canvas });
    addRectTransformComponent(world, entity);
    addUiSafeAreaComponent(world, entity);

    world.update();

    const { y } = world.getComponentRequired(entity, rectTransformId);

    expect(y.kind === 'stretch' && y.margin).toBeLessThan(0);
  });

  const createButtonEntity = (canvas: number): number => {
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addParentComponent(world, entity, { parent: canvas });
    addRectTransformComponent(
      world,
      entity,
      UiAnchor.center({ x: 300, y: 150 }),
    );
    addUiInteractableComponent(world, entity);

    return entity;
  };

  it('does not hit-test or receive pointer interaction without a pointerSource', () => {
    registerUiSystems(world, renderContext, time);

    const canvas = createUiCanvas(world, renderContext, {
      cullingMask: testCullingMask,
    });
    const button = createButtonEntity(canvas);

    world.update();

    expect(
      world.getComponentRequired(canvas, canvasId).hoveredEntity,
    ).toBeNull();
    expect(world.getComponentRequired(button, uiInteractableId).isHovered).toBe(
      false,
    );
  });

  it('wires pointer raycasting and interaction once a pointerSource is supplied', () => {
    const mouseInputSource = buildMouseInputSource(960, 540);

    registerUiSystems(world, renderContext, time, {
      pointerSource: mouseInputSource,
    });

    const canvas = createUiCanvas(world, renderContext, {
      cullingMask: testCullingMask,
    });
    const button = createButtonEntity(canvas);

    world.update();

    expect(world.getComponentRequired(canvas, canvasId).hoveredEntity).toBe(
      button,
    );
    expect(world.getComponentRequired(button, uiInteractableId).isHovered).toBe(
      true,
    );
  });

  it('resets wasInvokedThisFrame every tick via the always-registered navigation system', () => {
    registerUiSystems(world, renderContext, time);

    const canvas = createUiCanvas(world, renderContext, {
      cullingMask: testCullingMask,
    });
    const button = createButtonEntity(canvas);
    const interactable = world.getComponentRequired(button, uiInteractableId);

    interactable.wasInvokedThisFrame = true;

    world.update();

    expect(interactable.wasInvokedThisFrame).toBe(false);
  });
});
