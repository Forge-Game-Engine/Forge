import { Entity, type World } from '../../ecs';
import { InputsComponent } from '../components';
import { InputSystem } from '../systems';

export function addInputs(world: World, container: HTMLElement) {
  const inputsEntity = new Entity('inputs', [new InputsComponent()]);

  const inputSystem = new InputSystem(container);

  world.addEntity(inputsEntity);
  world.addSystem(inputSystem);

  return inputsEntity;
}
