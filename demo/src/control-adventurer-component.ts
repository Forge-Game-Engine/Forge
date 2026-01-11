import { createComponentId } from '../../src/new-ecs/ecs-component';

export interface ControlAdventurerEcsComponent {
  // Marker component - no data needed
}

export const controlAdventurerId =
  createComponentId<ControlAdventurerEcsComponent>('control-adventurer');
