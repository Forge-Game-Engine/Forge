import {
  addPositionComponent,
  createAgeScaleEcsSystem,
  createTransformEcsSystem,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import defaultFontImageUrl from '@forge-game-engine/forge/fonts/default/default.png';
import {
  Axis2dAction,
  buttonMoments,
  KeyboardAxis2dBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  keyCodes,
  MouseInputSource,
  registerInputs,
  TriggerAction,
} from '@forge-game-engine/forge/input';
import {
  createLifetimeTrackingEcsSystem,
  createRemoveFromWorldEcsSystem,
} from '@forge-game-engine/forge/lifecycle';
import { Random } from '@forge-game-engine/forge/math';
import {
  createParticleEcsSystem,
  createParticleOpacityEcsSystem,
  createParticlePositionEcsSystem,
} from '@forge-game-engine/forge/particles';
import {
  addSpriteComponent,
  Color,
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createPresentEcsSystem,
  createRenderEcsSystem,
  getCameraView,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  createLabel,
  createToggle,
  createUiCanvas,
  registerUiSystems,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { createBeacon } from './_create-beacon';
import { createMenu } from './_create-menu';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

function createBackdrop(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
): void {
  const { x: width, y: height } = getCameraView(
    world,
    camera,
    renderContext,
  ).size;

  const backdrop = world.createEntity();

  addPositionComponent(world, backdrop);
  addSpriteComponent(world, backdrop, {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.world,
    width,
    height,
    tintColor: new Color(0.09, 0.11, 0.16, 1),
  });
}

/**
 * Wires the mouse, plus the arrow keys to move focus and Enter/Space to
 * press the focused element, so hiding the focused button shows focus
 * being released.
 */
function createUiInputs(
  world: EcsWorld,
  time: Time,
  game: Game,
): {
  mouseInputSource: MouseInputSource;
  submitInput: TriggerAction;
  navigateInput: Axis2dAction;
} {
  const submitInput = new TriggerAction('ui-submit');
  const navigateInput = new Axis2dAction('ui-navigate');

  const inputManager = registerInputs(world, time, {
    triggerActions: [submitInput],
    axis2dActions: [navigateInput],
  });

  const mouseInputSource = new MouseInputSource(inputManager, game.container);
  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.axis2dBindings.add(
    new KeyboardAxis2dBinding(
      navigateInput,
      keyCodes.arrowUp,
      keyCodes.arrowDown,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );
  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(submitInput, keyCodes.enter, buttonMoments.down),
  );
  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(submitInput, keyCodes.space, buttonMoments.down),
  );

  return { mouseInputSource, submitInput, navigateInput };
}

interface Control {
  caption: string;
  isOn: boolean;
  onChange: (isOn: boolean) => void;
}

/**
 * Adds a toggle with a caption to its right, in a column down the canvas's
 * top-left corner, and calls `onChange` with the toggle's new state.
 */
function createControl(
  world: EcsWorld,
  canvas: number,
  fontAtlas: FontAtlas,
  sprites: { box: SpriteEcsComponent; checkmark: SpriteEcsComponent },
  row: number,
  { caption, isOn, onChange }: Control,
): void {
  const y = -100 - row * 70;

  const toggle = createToggle(world, canvas, {
    sprite: sprites.box,
    checkmarkSprite: sprites.checkmark,
    anchor: UiAnchor.topLeft({ x: 40, y: 40 }),
    anchoredPosition: { x: 80, y },
    isOn,
  });

  toggle.onValueChanged.registerListener(onChange);

  createLabel(world, canvas, {
    text: caption,
    fontAtlas,
    size: 26,
    anchor: UiAnchor.topLeft(),
    anchoredPosition: { x: 140, y: y - 20 },
    verticalAlign: textVerticalAlignments.middle,
    color: Color.white,
    category: renderLayers.ui,
  });
}

/**
 * Builds the visibility demo: a menu in a vertical layout group, a beacon
 * in the world with a child lamp and a spark emitter, and a column of
 * toggles that hide the "Load game" button, hide the whole menu, fade the
 * menu with a canvas group, and hide the beacon.
 * @returns The created game.
 */
export const createVisibilityGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  createBackdrop(world, camera, renderContext);

  const fontAtlasCache = new FontAtlasCache(renderContext);
  const fontAtlas = await fontAtlasCache.getOrLoad({
    // Importing the JSON would give its parsed contents, so `new URL` asks
    // webpack for its URL instead.
    metricsUrl: new URL(
      '@forge-game-engine/forge/fonts/default/default.json',
      import.meta.url,
    ).href,
    imageUrl: defaultFontImageUrl,
  });

  const { mouseInputSource, submitInput, navigateInput } = createUiInputs(
    world,
    time,
    game,
  );

  registerUiSystems(world, renderContext, time, {
    pointerSource: mouseInputSource,
  });

  const canvas = createUiCanvas(world, renderContext, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
    submitInput,
    navigateInput,
  });

  const panelTexture = await renderContext.textureCache.getOrLoad(
    getAssetUrl('img/kenney_fantasy-ui-borders/PNG/Double/Panel/panel-030.png'),
  );
  const panelSprite = {
    ...createImageSprite(panelTexture, {
      pixelsPerUnit: 1,
      slices: {
        left: 26,
        right: 26,
        top: 26,
        bottom: 26,
        nativeWidth: 96,
        nativeHeight: 96,
      },
    }),
    category: renderLayers.ui,
  };

  const menu = createMenu(
    world,
    canvas,
    fontAtlas,
    panelSprite,
    renderLayers.ui,
  );

  const beaconVisibility = await createBeacon(
    world,
    renderContext,
    renderLayers.world,
    { x: -60, y: -200 },
  );

  const solidUiSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.ui,
  };
  const sprites = {
    box: { ...solidUiSprite, tintColor: new Color(0.85, 0.85, 0.88, 1) },
    checkmark: { ...solidUiSprite, tintColor: new Color(0.3, 0.55, 0.95, 1) },
  };

  const controls: Control[] = [
    {
      caption: "Show 'Load game'",
      isOn: true,
      onChange: (isOn) => (menu.loadButtonVisibility.visible = isOn),
    },
    {
      caption: 'Show menu',
      isOn: true,
      onChange: (isOn) => (menu.visibility.visible = isOn),
    },
    {
      caption: 'Fade menu',
      isOn: false,
      onChange: (isOn) => (menu.canvasGroup.alpha = isOn ? 0.3 : 1),
    },
    {
      caption: 'Show beacon',
      isOn: true,
      onChange: (isOn) => (beaconVisibility.visible = isOn),
    },
  ];

  controls.forEach((control, row) => {
    createControl(world, canvas, fontAtlas, sprites, row, control);
  });

  world.addSystem(createParticleEcsSystem(time, new Random()));
  world.addSystem(createParticlePositionEcsSystem(time));
  world.addSystem(createLifetimeTrackingEcsSystem(time));
  world.addSystem(createAgeScaleEcsSystem());
  world.addSystem(createParticleOpacityEcsSystem());
  world.addSystem(createRemoveFromWorldEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
