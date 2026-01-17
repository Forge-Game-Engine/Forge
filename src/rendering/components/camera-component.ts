import { Axis1dAction, Axis2dAction } from '../../input/index.js';
import { Rect } from '../../math/index.js';
import { createComponentId } from '../../new-ecs/ecs-component.js';

export interface CameraEcsComponent {
  zoom: number;
  zoomSensitivity: number;
  panSensitivity: number;
  minZoom: number;
  maxZoom: number;
  isStatic: boolean;
  layerMask: number;
  scissorRect?: Rect;
  zoomInput?: Axis1dAction;
  panInput?: Axis2dAction;
}

export const cameraId = createComponentId<CameraEcsComponent>('camera');
