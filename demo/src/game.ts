import {
  createContainer,
  cubicShaderInclude,
  Game,
  ImageCache,
  perlinNoiseFragmentShader,
  perlinNoiseShaderInclude,
  quinticShaderInclude,
  radialGradientShader,
  radialGradientShaderInclude,
  randomGradientShaderInclude,
  RiveCache,
  sdfCircleShaderInclude,
  sdfOrientedBoxShaderInclude,
  ShaderStore,
  spriteFragmentShader,
  spriteVertexShader,
} from '../../src';
import { createPerlinNoiseScene } from './scenes';

export const game = new Game();

export const gameContainer = createContainer('forge-demo-game');

export const imageCache = new ImageCache();
export const riveCache = new RiveCache();
export const shaderStore = new ShaderStore();

shaderStore.addInclude(
  cubicShaderInclude,
  perlinNoiseShaderInclude,
  quinticShaderInclude,
  radialGradientShaderInclude,
  randomGradientShaderInclude,
  sdfCircleShaderInclude,
  sdfOrientedBoxShaderInclude,
);

shaderStore.addShader(
  radialGradientShader,
  perlinNoiseFragmentShader,
  spriteFragmentShader,
  spriteVertexShader,
);

game.registerScene(
  await createPerlinNoiseScene(game, gameContainer, imageCache, shaderStore),
);

game.run();
