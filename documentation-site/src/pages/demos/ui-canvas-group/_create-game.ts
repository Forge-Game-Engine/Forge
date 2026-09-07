import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  MouseInputSource,
  registerInputs,
} from '@forge-game-engine/forge/input';
import {
  addSpriteComponent,
  calculateVisibleWorldSize,
  Color,
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createPresentEcsSystem,
  createRenderEcsSystem,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  addCanvasGroupComponent,
  createButton,
  createLabel,
  createPanel,
  createToggle,
  createUiCanvas,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

async function createBackdrop(
  world: EcsWorld,
  renderContext: RenderContext,
): Promise<void> {
  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );
  const backdropSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.world,
  });
  backdropSprite.tintColor = new Color(0.09, 0.11, 0.16, 1);

  const { x: width, y: height } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );

  backdropSprite.width = width;
  backdropSprite.height = height;

  const backdrop = world.createEntity();

  addPositionComponent(world, backdrop);
  addSpriteComponent(world, backdrop, backdropSprite);
}

function createPointerInput(
  world: EcsWorld,
  time: Time,
  game: Game,
): MouseInputSource {
  const inputManager = registerInputs(world, time, {});

  return new MouseInputSource(inputManager, game.container);
}

/**
 * Builds the CanvasGroup demo: a "modal" card - a background panel
 * containing a nested inner panel, which itself contains a label and a
 * small `createButton` - all governed by a single `CanvasGroupEcsComponent`
 * on the outermost panel. Toggling "Disable modal" fades the whole
 * three-level subtree to 30% alpha and turns off its interaction
 * (`interactable`/`blocksRaycasts`) in one write, proving
 * `createUiCanvasGroupEcsSystem` propagates through every descendant, not
 * just direct children - the "Confirm" button becomes genuinely
 * unable to be clicked while disabled, not just dimmed. The toggle itself lives
 * outside the group, so it stays fully opaque and clickable throughout.
 * @param fontAtlasUrl - The URL of the font atlas JSON to load.
 * @returns The created game.
 */
export const createCanvasGroupGame = async (
  fontAtlasUrl: string,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createBackdrop(world, renderContext);

  const fontAtlasCache = new FontAtlasCache(renderContext.imageCache);
  const fontAtlas: FontAtlas = await fontAtlasCache.getOrLoad(fontAtlasUrl);

  const mouseInputSource = createPointerInput(world, time, game);

  const canvas = createUiCanvas(world, renderContext, time, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
    pointerSource: mouseInputSource,
  });

  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );

  const boxColor = new Color(0.85, 0.85, 0.88, 1);
  const boxSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.ui,
  });
  boxSprite.tintColor = boxColor;

  createLabel(world, canvas, {
    text: 'Disable modal',
    fontAtlas,
    size: 26,
    anchor: UiAnchor.topLeft(),
    anchoredPosition: { x: 60, y: -60 },
    verticalAlign: textVerticalAlignments.middle,
    color: Color.white,
    category: renderLayers.ui,
  });

  const toggleBoxSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.ui,
  });
  toggleBoxSprite.tintColor = boxColor;

  const crossImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/space-shooter/icon_crossSmall.png'),
  );
  const crossSprite = createImageSprite(crossImage, renderContext, {
    layer: renderLayers.ui,
  });
  crossSprite.tintColor = new Color(0.85, 0.3, 0.3, 1);

  // Level 0 (outermost, ungoverned): the modal's own background - this is
  // the entity `addCanvasGroupComponent` is attached to.
  const modal = createPanel(world, canvas, {
    sprite: boxSprite,
    anchor: UiAnchor.center({ x: 900, y: 560 }),
  });

  const canvasGroup = addCanvasGroupComponent(world, modal, { alpha: 1 });

  // Level 1: a nested card, visually distinct from the modal background,
  // to make "the whole subtree fades, not just the modal panel itself"
  // obvious at a glance.
  const cardSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.ui,
  });
  cardSprite.tintColor = new Color(0.2, 0.23, 0.32, 1);

  const card = createPanel(world, modal, {
    sprite: cardSprite,
    anchor: UiAnchor.center({ x: 560, y: 280 }),
  });

  // Level 2: a label and a small button nested inside the card - two more
  // descendants down from the governed entity, proving alpha/interactable
  // propagate arbitrarily deep, not just to direct children of `modal`.
  createLabel(world, card, {
    text: 'Nested content',
    fontAtlas,
    size: 32,
    anchor: UiAnchor.topLeft(),
    anchoredPosition: { x: 40, y: -40 },
    color: Color.white,
    category: renderLayers.ui,
  });

  createLabel(world, card, {
    text:
      'This label, the card behind it, and the button below all sit two ' +
      'or three levels under the CanvasGroup - toggling it fades and ' +
      'disables all of them in one write.',
    fontAtlas,
    size: 20,
    maxWidth: 480,
    anchor: UiAnchor.topLeft(),
    anchoredPosition: { x: 40, y: -100 },
    color: new Color(0.8, 0.82, 0.88, 1),
    category: renderLayers.ui,
  });

  const nestedButtonSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.ui,
  });

  const buttonColor = new Color(0.35, 0.55, 0.95, 1);

  // A real createButton, not just a panel + label - a point-anchored
  // label's text only centers within maxWidth (see createButton's own
  // labelMaxWidth doc comment: it's derived from anchor.x's own size for a
  // point anchor), which a hand-paired createPanel/createLabel forgets to
  // pass. Using createButton here sidesteps that trap entirely, and as a
  // bonus makes "Confirm" a genuinely interactable button - so disabling
  // the modal also demonstrates CanvasGroupEcsComponent.interactable/
  // blocksRaycasts, not just alpha.
  //
  // createUiTransitionEcsSystem drives the sprite's own tintColor from
  // this `transition` every frame (normalColor while idle), overwriting
  // whatever tint the sprite had before it was passed in - so the button's
  // actual color is set here, not via `nestedButtonSprite.tintColor`.
  createButton(world, card, {
    sprite: nestedButtonSprite,
    label: 'Confirm',
    fontAtlas,
    labelSize: 22,
    labelColor: Color.white,
    labelCategory: renderLayers.ui,
    anchor: UiAnchor.bottomLeft({ x: 200, y: 56 }),
    anchoredPosition: { x: 40, y: 40 },
    transition: {
      normalColor: buttonColor,
      hoverColor: new Color(0.45, 0.63, 0.98, 1),
      pressedColor: new Color(0.25, 0.42, 0.8, 1),
    },
  });

  const modalToggle = createToggle(world, canvas, {
    sprite: toggleBoxSprite,
    checkmarkSprite: crossSprite,
    anchor: UiAnchor.topLeft({ x: 32, y: 32 }),
    anchoredPosition: { x: 300, y: -60 },
  });

  modalToggle.onValueChanged.registerListener((isDisabled) => {
    canvasGroup.alpha = isDisabled ? 0.3 : 1;
    canvasGroup.interactable = !isDisabled;
    canvasGroup.blocksRaycasts = !isDisabled;
  });

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
