import { PositionComponent } from '../../common';
import { Entity, World } from '../../ecs';
import { InputsComponent, InputSystem } from '../../input';
import { Vector2 } from '../../math';
import {
  CameraComponent,
  type CameraComponentOptions,
  CameraSystem,
  LayerService,
} from '../../rendering';
import type { Game } from '../game';
import { Scene } from '../scene';

export type SceneCreationOptions = {
  screenWidth: number;
  screenHeight: number;
  camera: Partial<CameraComponentOptions>;
  cameraEntityName: string;
  inputsEntityName: string;
  cameraStartPosition: Vector2;
};

export const defaultSceneCreationOptions: SceneCreationOptions = {
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  camera: {},
  cameraEntityName: 'camera',
  inputsEntityName: 'inputs',
  cameraStartPosition: new Vector2(0, 0),
};

type SceneCreationResult = {
  scene: Scene;
  world: World;
  layerService: LayerService;
  cameraEntity: Entity;
  inputsEntity: Entity;
};

export function createScene(
  name: string,
  game: Game,
  container: HTMLElement,
  sceneCreationOptions?: Partial<SceneCreationOptions>,
): SceneCreationResult {
  const mergedOptions = {
    ...defaultSceneCreationOptions,
    ...sceneCreationOptions,
  };

  const scene = new Scene(name);
  const layerService = new LayerService();
  const world = new World();

  const cameraEntity = world.buildAndAddEntity(mergedOptions.cameraEntityName, [
    new CameraComponent(mergedOptions.camera),
    new PositionComponent(
      mergedOptions.cameraStartPosition.x,
      mergedOptions.cameraStartPosition.y,
    ),
  ]);

  const inputsEntity = world.buildAndAddEntity(mergedOptions.inputsEntityName, [
    new InputsComponent(),
  ]);

  const inputSystem = new InputSystem(
    container,
    cameraEntity,
    mergedOptions.screenWidth,
    mergedOptions.screenHeight,
  );

  const cameraSystem = new CameraSystem(inputsEntity, game.time);

  world.addSystems(inputSystem, cameraSystem);

  scene.registerUpdatable(world);
  scene.registerStoppables(world, layerService);

  const resizeListener = () => {
    layerService.resizeAllLayers();
  };
  window.addEventListener('resize', resizeListener);

  scene.registerStoppables({
    stop: () => {
      window.removeEventListener('resize', resizeListener);
    },
  });

  return {
    scene,
    world,
    layerService,
    cameraEntity,
    inputsEntity,
  };
}
