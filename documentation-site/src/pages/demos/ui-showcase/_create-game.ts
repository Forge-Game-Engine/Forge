import { createAnimationEcsSystem } from '@forge-game-engine/forge/animations';
import { SystemRegistrationOrder } from '@forge-game-engine/forge/ecs';
import {
  KeyboardInputSource,
  MouseInputSource,
  registerInputs,
} from '@forge-game-engine/forge/input';
import { Vector2 } from '@forge-game-engine/forge/math';
import { Color } from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createUiButton,
  createUiCanvas,
  createUiDropdownEcsSystem,
  createUiHitTestEcsSystem,
  createUiInputEcsSystem,
  createUiKeyboardNavEcsSystem,
  createUiLayoutEcsSystem,
  createUiPanel,
  createUiRenderable,
  createUiRenderEcsSystem,
  createUiResizeObserver,
  createUiScrollEcsSystem,
  createUiScrollGroup,
  createUiSliderEcsSystem,
  createUiStateEcsSystem,
  createUiText,
  createUiTextEcsSystem,
  createUiTextInputSource,
  loadFontAsset,
  registerUiInputActions,
  uiFocusId,
  uiHitTestSystemOrder,
  uiPointerStateId,
} from '@forge-game-engine/forge/ui';
import { createAdvancedSection } from './_create-advanced-section';
import { createAnimationSection } from './_create-animation-section';
import { createLayoutSection } from './_create-layout-section';
import { createScaleSection } from './_create-scale-section';
import { createStylingSection } from './_create-styling-section';
import { createTextSection } from './_create-text-section';
import { createWidgetsSection } from './_create-widgets-section';
import { applyTheme, showcaseThemes } from './_theme';
import type { ThemedRenderable } from './_theme';
import type { SectionContext } from './_section-context';

const HEADER_HEIGHT = 48;

export const createUiShowcaseGame = async (
  fontJsonUrl: string,
  fontAtlasUrl: string,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const inputManager = registerInputs(world, time);
  const mouseSource = new MouseInputSource(inputManager, renderContext.canvas);
  const keyboardSource = new KeyboardInputSource(inputManager);

  registerUiInputActions(inputManager, { mouseSource, keyboardSource });

  const textInputSource = createUiTextInputSource(game.container);

  const canvasEntity = createUiCanvas(world, {
    width: renderContext.canvas.width,
    height: renderContext.canvas.height,
  });

  world.addComponent(canvasEntity, uiPointerStateId, {
    hovered: null,
    pressed: null,
    pointer: Vector2.zero,
  });
  world.addComponent(canvasEntity, uiFocusId, { focused: null, focusRing: false });

  createUiResizeObserver(game.container, canvasEntity, world);

  world.addSystem(createUiLayoutEcsSystem());
  world.addSystem(createAnimationEcsSystem(time));
  world.addSystem(createUiHitTestEcsSystem(inputManager), uiHitTestSystemOrder);
  world.addSystem(createUiStateEcsSystem(inputManager));
  world.addSystem(createUiKeyboardNavEcsSystem(inputManager));
  world.addSystem(createUiSliderEcsSystem(inputManager));
  world.addSystem(createUiScrollEcsSystem(inputManager));
  world.addSystem(createUiInputEcsSystem(inputManager, textInputSource));
  world.addSystem(createUiDropdownEcsSystem(inputManager));
  world.addSystem(createUiRenderEcsSystem(renderContext), SystemRegistrationOrder.late);
  world.addSystem(createUiTextEcsSystem(renderContext), SystemRegistrationOrder.late);

  const font = await loadFontAsset(renderContext, fontJsonUrl, fontAtlasUrl);

  const canvasWidth = renderContext.canvas.width;
  const canvasHeight = renderContext.canvas.height;
  const contentWidth = canvasWidth;

  const panelRenderable = createUiRenderable(renderContext);

  // ── Fixed header (outside the scroll viewport) ─────────────────────────

  createUiText(world, renderContext, {
    text: 'Forge UI Showcase',
    font,
    fontSize: 20,
    color: Color.white,
    verticalAlign: 'middle',
    rect: { x: 16, y: 0, width: canvasWidth - 180, height: HEADER_HEIGHT },
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(0, 0),
    parent: canvasEntity,
  });

  let themeIndex = 0;
  const themedRenderables: ThemedRenderable[] = [];

  const themeButton = createUiButton(world, {
    renderable: panelRenderable,
    renderContext,
    font,
    anchorMin: new Vector2(1, 0),
    anchorMax: new Vector2(1, 0),
    pivot: new Vector2(1, 0),
    rect: { x: -140, y: 8, width: 120, height: 32 },
    parent: canvasEntity,
    label: `Theme: ${showcaseThemes[themeIndex].name}`,
    labelColor: Color.white,
    cornerRadius: 6,
    tintColor: new Color(0.25, 0.27, 0.32, 1),
    onClick: () => {
      themeIndex = (themeIndex + 1) % showcaseThemes.length;
      applyTheme(themedRenderables, showcaseThemes[themeIndex]);
      themeButton.setLabel(`Theme: ${showcaseThemes[themeIndex].name}`);
    },
  });

  // ── Scrollable section content ──────────────────────────────────────────

  const scrollRenderable = createUiRenderable(renderContext);

  const sectionBuilders = [
    createLayoutSection,
    createStylingSection,
    createTextSection,
    createWidgetsSection,
    createAdvancedSection,
    createAnimationSection,
    createScaleSection,
  ];

  // Two-pass build: the scroll group needs a total content height up front,
  // but each section needs the (already created) content entity as its
  // parent. Create the scroll group with a placeholder size, build the
  // sections into its content entity, then patch the real height in.
  const scrollGroup = createUiScrollGroup(world, {
    renderable: scrollRenderable,
    contentRenderable: scrollRenderable,
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(1, 1),
    offsetMin: new Vector2(0, HEADER_HEIGHT),
    offsetMax: new Vector2(0, 0),
    parent: canvasEntity,
    tintColor: Color.transparent,
    contentSize: new Vector2(contentWidth, canvasHeight - HEADER_HEIGHT),
    showScrollbar: true,
    scrollbarRenderable: panelRenderable,
  });

  // `viewportSize` isn't derived from the viewport rect automatically; the
  // scroll system needs it set explicitly to clamp scrolling correctly.
  scrollGroup.scroll.viewportSize = new Vector2(contentWidth, canvasHeight - HEADER_HEIGHT);

  let y = 16;

  for (const buildSection of sectionBuilders) {
    const sectionContext: SectionContext = {
      world,
      renderContext,
      canvasEntity,
      contentEntity: scrollGroup.contentEntity,
      contentWidth,
      y,
      font,
      panelRenderable,
      textInputSource,
    };

    const result = buildSection(sectionContext);

    y += result.height;
    themedRenderables.push(...result.themedRenderables);
  }

  scrollGroup.scroll.contentSize = new Vector2(contentWidth, y + 16);

  applyTheme(themedRenderables, showcaseThemes[themeIndex]);

  // Background behind everything so the canvas isn't transparent.
  createUiPanel(world, {
    renderable: panelRenderable,
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(1, 1),
    offsetMin: new Vector2(0, 0),
    offsetMax: new Vector2(0, 0),
    parent: canvasEntity,
    zIndex: -10,
    tintColor: new Color(0.05, 0.06, 0.08, 1),
  });

  return game;
};
