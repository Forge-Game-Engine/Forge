import {
  addPositionComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Random } from '@forge-game-engine/forge/math';
import {
  Color,
  createCamera,
  createRenderEcsSystem,
  Material,
} from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
  shapeText,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createAnimateTextMaterialsEcsSystem } from './_animate-text-materials.system';
import { createTextMaterials } from './_create-text-materials';

const textSize = 96;
const lineSpacing = 150;

const addCenteredWord = (
  world: EcsWorld,
  fontAtlas: FontAtlas,
  text: string,
  y: number,
  color: Color,
  material: Material,
): void => {
  const { width } = shapeText(text, fontAtlas.data, { size: textSize }).bounds;
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: { x: -width / 2, y } });
  addTextComponent(world, entity, {
    text,
    fontAtlas,
    size: textSize,
    color,
    verticalAlign: textVerticalAlignments.middle,
    material,
  });
};

export const createTextMaterialsGame = async (
  fontAtlasUrl: string,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
    clearColor: new Color(0.06, 0.07, 0.1),
  });

  const fontAtlas = await new FontAtlasCache(
    renderContext.imageCache,
  ).getOrLoad(fontAtlasUrl);
  const materials = createTextMaterials(renderContext);

  addCenteredWord(
    world,
    fontAtlas,
    'SHIMMER',
    lineSpacing,
    new Color(0.95, 0.7, 0.2),
    materials.shimmer,
  );
  addCenteredWord(
    world,
    fontAtlas,
    'DISSOLVE',
    0,
    new Color(0.85, 0.88, 0.95),
    materials.dissolve,
  );
  addCenteredWord(
    world,
    fontAtlas,
    'GLITCH',
    -lineSpacing,
    new Color(0.4, 0.95, 0.9),
    materials.flicker,
  );

  world.addSystem(
    createAnimateTextMaterialsEcsSystem(time, new Random(), materials),
  );
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
