import {
  createContainer,
  cubicShaderInclude,
  ForgeShaderSource,
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

shaderStore.addInclude(new ForgeShaderSource(cubicShaderInclude));
shaderStore.addInclude(new ForgeShaderSource(perlinNoiseShaderInclude));
shaderStore.addInclude(new ForgeShaderSource(quinticShaderInclude));
shaderStore.addInclude(new ForgeShaderSource(radialGradientShaderInclude));
shaderStore.addInclude(new ForgeShaderSource(randomGradientShaderInclude));
shaderStore.addInclude(new ForgeShaderSource(sdfCircleShaderInclude));
shaderStore.addInclude(new ForgeShaderSource(sdfOrientedBoxShaderInclude));

shaderStore.addShader(new ForgeShaderSource(radialGradientShader));
shaderStore.addShader(new ForgeShaderSource(perlinNoiseFragmentShader));
shaderStore.addShader(new ForgeShaderSource(spriteFragmentShader));
shaderStore.addShader(new ForgeShaderSource(spriteVertexShader));

game.registerScene(
  await createPerlinNoiseScene(game, gameContainer, imageCache, shaderStore),
);

game.run();
