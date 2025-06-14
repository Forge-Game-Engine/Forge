import { PositionComponent } from '../../common';
import { Entity, World } from '../../ecs';
import { InputsComponent, InputSystem } from '../../input';
import { Vector2 } from '../../math';
import {
  addForgeRenderLayers,
  CameraComponent,
  type CameraComponentOptions,
  CameraSystem,
  DEFAULT_LAYERS,
  ForgeRenderLayer,
  LayerService,
} from '../../rendering';
import type { Game } from '../game';

export type WorldCreationOptions = {
  screenWidth: number;
  screenHeight: number;
  camera: Partial<CameraComponentOptions>;
  cameraEntityName: string;
  inputsEntityName: string;
  cameraStartPosition: Vector2;
  renderLayerNames: string[];
};

export const defaultWorldCreationOptions: WorldCreationOptions = {
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  camera: {},
  cameraEntityName: 'camera',
  inputsEntityName: 'inputs',
  cameraStartPosition: new Vector2(0, 0),
  renderLayerNames: [DEFAULT_LAYERS.background, DEFAULT_LAYERS.foreground],
};

type WorldCreationResult = {
  world: World;
  layerService: LayerService;
  cameraEntity: Entity;
  inputsEntity: Entity;
  renderLayers: ForgeRenderLayer[];
};

/**
 * Creates a new world with the specified name and registers it with the game.
 * Sets up the camera and input systems, and returns the created world and its components.
 *
 * @param name - The name of the world to create.
 * @param game - The game instance to register the world with.
 * @param worldCreationOptions - Optional parameters for customizing the world creation.
 * @returns An object containing the created world, layer service, camera entity, inputs entity and render layers.
 */
export function createWorld(
  name: string,
  game: Game,
  worldCreationOptions?: Partial<WorldCreationOptions>,
): WorldCreationResult {
  const {
    cameraEntityName,
    camera,
    cameraStartPosition,
    inputsEntityName,
    screenHeight,
    screenWidth,
    renderLayerNames,
  } = {
    ...defaultWorldCreationOptions,
    ...worldCreationOptions,
  };

  const world = new World(name);
  game.registerWorld(world);

  const layerService = new LayerService(game);

  const cameraEntity = world.buildAndAddEntity(cameraEntityName, [
    new CameraComponent(camera),
    new PositionComponent(cameraStartPosition.x, cameraStartPosition.y),
  ]);

  const inputsEntity = world.buildAndAddEntity(inputsEntityName, [
    new InputsComponent(),
  ]);

  const inputSystem = new InputSystem(
    game.container,
    cameraEntity,
    screenWidth,
    screenHeight,
  );

  const cameraSystem = new CameraSystem(inputsEntity, world.time);

  const renderLayers = addForgeRenderLayers(
    renderLayerNames,
    game.container,
    layerService,
    world,
    cameraEntity,
  );

  world.addSystems(inputSystem, cameraSystem);

  const resizeListener = () => {
    layerService.resizeAllLayers();
  };

  window.addEventListener('resize', resizeListener);

  return {
    world,
    layerService,
    cameraEntity,
    inputsEntity,
    renderLayers,
  };
}
