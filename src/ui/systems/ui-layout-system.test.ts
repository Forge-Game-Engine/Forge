import { describe, expect, it, vi } from 'vitest';
import { createUiLayoutEcsSystem } from './ui-layout-system.js';
import {
  addParentComponent,
  addPositionComponent,
  positionId,
} from '../../common/index.js';
import { createTransformEcsSystem } from '../../common/systems/transform-system.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  addCameraComponent,
  addSpriteComponent,
  cameraId,
  Renderable,
  RenderContext,
  RenderTarget,
  spriteId,
} from '../../rendering/index.js';
import { addTextComponent, textId } from '../../text/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import {
  addCanvasComponent,
  CanvasDefaultedOptions,
} from '../components/canvas-component.js';
import {
  addRectTransformComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import { UiAnchor } from '../types/ui-anchor.js';
import { uiScaleModes } from '../types/ui-scale-mode.js';

const buildRenderContext = (width: number, height: number): RenderContext =>
  ({ width, height }) as RenderContext;

const buildRenderable = (): Renderable => ({}) as Renderable;

/** Creates a canvas entity (`CanvasEcsComponent` + `RectTransformEcsComponent` + `PositionEcsComponent`) with a UI camera, without going through `createUiCanvas`, so the layout system can be tested in isolation. */
const createTestCanvas = (
  world: EcsWorld,
  options: Partial<CanvasDefaultedOptions> = {},
  renderTarget?: RenderTarget,
): { canvas: number; camera: number } => {
  const camera = world.createEntity();

  addPositionComponent(world, camera);
  addCameraComponent(world, camera, { renderTarget });

  const canvas = world.createEntity();

  addPositionComponent(world, canvas);
  addRectTransformComponent(world, canvas);
  addCanvasComponent(world, canvas, { camera, ...options });

  return { canvas, camera };
};

describe('createUiLayoutEcsSystem', () => {
  it('resolves a canvas root rect centered at the origin, sized to referenceResolution.y by default', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas, camera } = createTestCanvas(world);

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    expect(world.getComponent(canvas, rectTransformId)!.rect).toEqual({
      min: { x: -960, y: -540 },
      max: { x: 960, y: 540 },
    });
    expect(world.getComponent(canvas, positionId)!.local).toEqual({
      x: 0,
      y: 0,
    });
    expect(world.getComponent(camera, cameraId)!.verticalWorldUnits).toBe(1080);
  });

  it('follows the destination aspect ratio (scaleWithScreenSize keeps height, grows width)', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1600, 800); // 2:1 aspect ratio
    const { canvas } = createTestCanvas(world);

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    // height stays 1080, width follows aspect ratio: 1080 * 2 = 2160
    expect(world.getComponent(canvas, rectTransformId)!.rect).toEqual({
      min: { x: -1080, y: -540 },
      max: { x: 1080, y: 540 },
    });
  });

  it('re-resolves the canvas rect when renderContext dimensions change between updates', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world);

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    expect(world.getComponent(canvas, rectTransformId)!.rect.max).toEqual({
      x: 960,
      y: 540,
    });

    renderContext.width = 960;
    renderContext.height = 1080;
    world.update();

    expect(world.getComponent(canvas, rectTransformId)!.rect).toEqual({
      min: { x: -480, y: -540 },
      max: { x: 480, y: 540 },
    });
  });

  it("resizes the camera's render target to match renderContext when they drift out of sync", () => {
    const world = new EcsWorld();
    const gl = {} as WebGL2RenderingContext;
    const renderContext = { width: 1920, height: 1080, gl } as RenderContext;
    const resize = vi.fn();
    const renderTarget = {
      width: 1920,
      height: 1080,
      resize,
    } as unknown as RenderTarget;
    const { canvas } = createTestCanvas(world, {}, renderTarget);

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    expect(resize).not.toHaveBeenCalled();

    renderContext.width = 800;
    renderContext.height = 600;
    world.update();

    expect(resize).toHaveBeenCalledWith(gl, 800, 600);
    expect(world.getComponent(canvas, rectTransformId)!.rect).toEqual({
      min: { x: -720, y: -540 },
      max: { x: 720, y: 540 },
    });
  });

  it('recomputes verticalWorldUnits from the live aspect ratio in matchWidth mode', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 960); // 2:1 aspect ratio
    const { canvas, camera } = createTestCanvas(world, {
      scaleMode: uiScaleModes.matchWidth,
    });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    // width stays 1920, height follows aspect ratio: 1920 / 2 = 960
    expect(world.getComponent(canvas, rectTransformId)!.rect).toEqual({
      min: { x: -960, y: -480 },
      max: { x: 960, y: 480 },
    });
    expect(world.getComponent(camera, cameraId)!.verticalWorldUnits).toBe(960);
  });

  it('sizes the root rect to the destination pixel size in constantPixelSize mode', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(800, 600);
    const { canvas, camera } = createTestCanvas(world, {
      scaleMode: uiScaleModes.constantPixelSize,
    });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    expect(world.getComponent(canvas, rectTransformId)!.rect).toEqual({
      min: { x: -400, y: -300 },
      max: { x: 400, y: 300 },
    });
    expect(world.getComponent(camera, cameraId)!.verticalWorldUnits).toBe(600);
  });

  it('resolves a point-anchored child rect and position.local relative to its parent canvas', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world);

    const panel = world.createEntity();

    addPositionComponent(world, panel);
    addParentComponent(world, panel, { parent: canvas });
    addRectTransformComponent(world, panel, {
      ...UiAnchor.topLeft,
      sizeDelta: { x: 200, y: 100 },
    });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    expect(world.getComponent(panel, rectTransformId)!.rect).toEqual({
      min: { x: -960, y: 440 },
      max: { x: -760, y: 540 },
    });
    // pivot is (0,1): the panel's own pivot sits at its rect's top-left,
    // i.e. exactly the canvas root's top-left corner.
    expect(world.getComponent(panel, positionId)!.local).toEqual({
      x: -960,
      y: 540,
    });
  });

  it('resolves a stretched child that spans the full canvas width', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world);

    const topBar = world.createEntity();

    addPositionComponent(world, topBar);
    addParentComponent(world, topBar, { parent: canvas });
    addRectTransformComponent(world, topBar, {
      ...UiAnchor.stretchTop,
      sizeDelta: { x: 0, y: 80 },
    });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    expect(world.getComponent(topBar, rectTransformId)!.rect).toEqual({
      min: { x: -960, y: 460 },
      max: { x: 960, y: 540 },
    });
  });

  it('writes sprite width/height/pivot/sortDepth for elements with a SpriteEcsComponent, in hierarchy pre-order', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world);

    const panel = world.createEntity();

    addPositionComponent(world, panel);
    addParentComponent(world, panel, { parent: canvas });
    addRectTransformComponent(world, panel, {
      ...UiAnchor.center,
      sizeDelta: { x: 300, y: 150 },
    });
    addSpriteComponent(world, panel, {
      width: 1,
      height: 1,
      renderable: buildRenderable(),
    });

    const label = world.createEntity();

    addPositionComponent(world, label);
    addParentComponent(world, label, { parent: panel });
    addRectTransformComponent(world, label, {
      ...UiAnchor.stretchAll,
      sizeDelta: { x: 0, y: 0 },
    });
    addSpriteComponent(world, label, {
      width: 1,
      height: 1,
      renderable: buildRenderable(),
    });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    const panelSprite = world.getComponent(panel, spriteId)!;
    const labelSprite = world.getComponent(label, spriteId)!;

    expect(panelSprite.width).toBe(300);
    expect(panelSprite.height).toBe(150);
    expect(panelSprite.pivot).toEqual({ x: 0.5, y: 0.5 });
    expect(labelSprite.width).toBe(300);
    expect(labelSprite.height).toBe(150);

    // canvas root (index 0) -> panel (index 1) -> label (index 2)
    expect(panelSprite.sortDepth).toBe(1);
    expect(labelSprite.sortDepth).toBe(2);
    expect(world.getComponent(panel, rectTransformId)!.sortDepth).toBe(1);
    expect(world.getComponent(label, rectTransformId)!.sortDepth).toBe(2);
  });

  it('writes RectTransformEcsComponent.sortDepth even for elements with no sprite or text', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world);

    const hitRegion = world.createEntity();

    addPositionComponent(world, hitRegion);
    addParentComponent(world, hitRegion, { parent: canvas });
    addRectTransformComponent(world, hitRegion, { ...UiAnchor.stretchAll });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    expect(world.getComponent(hitRegion, rectTransformId)!.sortDepth).toBe(1);
  });

  it('writes sortDepth for a TextEcsComponent child so it draws after its parent panel regardless of world Y', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world);

    // Anchored to the top edge, so its own position.world.y sits *above*
    // the centered label's - without a matching sortDepth, this panel would
    // draw over (hide) its own label under the render system's world-Y sort.
    const panel = world.createEntity();

    addPositionComponent(world, panel);
    addParentComponent(world, panel, { parent: canvas });
    addRectTransformComponent(world, panel, {
      ...UiAnchor.stretchTop,
      sizeDelta: { x: 0, y: 96 },
    });
    addSpriteComponent(world, panel, {
      width: 1,
      height: 1,
      renderable: buildRenderable(),
    });

    const label = world.createEntity();

    addPositionComponent(world, label);
    addParentComponent(world, label, { parent: panel });
    addRectTransformComponent(world, label, { ...UiAnchor.center });
    addTextComponent(world, label, {
      text: 'Title',
      fontAtlas: {} as FontAtlas,
      size: 32,
    });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    const panelSprite = world.getComponent(panel, spriteId)!;
    const labelText = world.getComponent(label, textId)!;

    expect(labelText.sortDepth).toBeGreaterThan(panelSprite.sortDepth!);
  });

  it("syncs TextEcsComponent.maxWidth to the resolved rect's width for a stretch-x anchor, leaving a point anchor's maxWidth untouched", () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world);

    const topBar = world.createEntity();

    addPositionComponent(world, topBar);
    addParentComponent(world, topBar, { parent: canvas });
    addRectTransformComponent(world, topBar, {
      ...UiAnchor.stretchTop,
      sizeDelta: { x: -40, y: 96 },
    });

    const stretchedLabel = world.createEntity();

    addPositionComponent(world, stretchedLabel);
    addParentComponent(world, stretchedLabel, { parent: topBar });
    addRectTransformComponent(world, stretchedLabel, {
      ...UiAnchor.stretchHorizontalLeft,
      sizeDelta: { x: 0, y: 0 },
    });
    addTextComponent(world, stretchedLabel, {
      text: 'Title',
      fontAtlas: {} as FontAtlas,
      size: 32,
    });

    const pointLabel = world.createEntity();

    addPositionComponent(world, pointLabel);
    addParentComponent(world, pointLabel, { parent: topBar });
    addRectTransformComponent(world, pointLabel, { ...UiAnchor.center });
    addTextComponent(world, pointLabel, {
      text: 'Title',
      fontAtlas: {} as FontAtlas,
      size: 32,
      maxWidth: 123,
    });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    // topBar's own resolved width - see the "resolves a stretched child"
    // test above for where 1920 - 40 comes from.
    expect(world.getComponent(stretchedLabel, textId)!.maxWidth).toBe(1880);
    expect(world.getComponent(pointLabel, textId)!.maxWidth).toBe(123);
  });

  it("syncs TextEcsComponent.horizontalAlignPivot to the anchor's pivot.x for a stretch-x anchor, leaving a point anchor's untouched", () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world);

    const centerPivotLabel = world.createEntity();

    addPositionComponent(world, centerPivotLabel);
    addParentComponent(world, centerPivotLabel, { parent: canvas });
    addRectTransformComponent(world, centerPivotLabel, {
      ...UiAnchor.stretchAll,
      sizeDelta: { x: 0, y: 0 },
    });
    addTextComponent(world, centerPivotLabel, {
      text: 'Title',
      fontAtlas: {} as FontAtlas,
      size: 32,
    });

    const leftPivotLabel = world.createEntity();

    addPositionComponent(world, leftPivotLabel);
    addParentComponent(world, leftPivotLabel, { parent: canvas });
    addRectTransformComponent(world, leftPivotLabel, {
      ...UiAnchor.stretchHorizontalLeft,
      sizeDelta: { x: 0, y: 0 },
    });
    addTextComponent(world, leftPivotLabel, {
      text: 'Title',
      fontAtlas: {} as FontAtlas,
      size: 32,
    });

    const pointLabel = world.createEntity();

    addPositionComponent(world, pointLabel);
    addParentComponent(world, pointLabel, { parent: canvas });
    addRectTransformComponent(world, pointLabel, { ...UiAnchor.center });
    addTextComponent(world, pointLabel, {
      text: 'Title',
      fontAtlas: {} as FontAtlas,
      size: 32,
      maxWidth: 123,
      horizontalAlignPivot: 0.5,
    });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    expect(
      world.getComponent(centerPivotLabel, textId)!.horizontalAlignPivot,
    ).toBe(0.5);
    expect(
      world.getComponent(leftPivotLabel, textId)!.horizontalAlignPivot,
    ).toBe(0);
    expect(world.getComponent(pointLabel, textId)!.horizontalAlignPivot).toBe(
      0.5,
    );
  });

  it('composes correctly with createTransformEcsSystem to produce the intended absolute world position, nested three deep', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);
    const { canvas } = createTestCanvas(world);

    const panel = world.createEntity();

    addPositionComponent(world, panel);
    addParentComponent(world, panel, { parent: canvas });
    addRectTransformComponent(world, panel, {
      ...UiAnchor.topRight,
      sizeDelta: { x: 200, y: 100 },
    });

    const label = world.createEntity();

    addPositionComponent(world, label);
    addParentComponent(world, label, { parent: panel });
    addRectTransformComponent(world, label, {
      ...UiAnchor.center,
      sizeDelta: { x: 40, y: 20 },
    });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.addSystem(createTransformEcsSystem());
    world.update();

    // canvas root is 1920x1080 centered at origin -> top-right corner (960, 540)
    // panel is a 200x100 box pinned to that corner -> spans (760,440)-(960,540)
    // label is a 40x20 box centered in the panel -> its own pivot (center)
    // sits at the panel's center: (860, 490)
    expect(world.getComponent(label, positionId)!.world).toEqual({
      x: 860,
      y: 490,
    });
  });

  it('resolves a rect transform with no parent and no canvas against a zero rect at the origin', () => {
    const world = new EcsWorld();
    const renderContext = buildRenderContext(1920, 1080);

    const orphan = world.createEntity();

    addPositionComponent(world, orphan);
    addRectTransformComponent(world, orphan, {
      ...UiAnchor.center,
      sizeDelta: { x: 20, y: 20 },
    });

    world.addSystem(createUiLayoutEcsSystem(renderContext));
    world.update();

    expect(world.getComponent(orphan, rectTransformId)!.rect).toEqual({
      min: { x: -10, y: -10 },
      max: { x: 10, y: 10 },
    });
  });
});
