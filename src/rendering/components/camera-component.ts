import { Axis1dAction, Axis2dAction } from '../../input/index.js';
import { Rect } from '../../math/index.js';
import { createComponentId } from '../../ecs/ecs-component.js';
import { RenderTarget } from '../render-target.js';

export interface CameraEcsComponent {
  zoom: number;
  zoomSensitivity: number;
  panSensitivity: number;
  minZoom: number;
  maxZoom: number;
  isStatic: boolean;
  cullingMask: number;
  scissorRect?: Rect;
  zoomInput?: Axis1dAction;
  panInput?: Axis2dAction;
  /**
   * When set, this camera renders into the given off-screen render target
   * instead of directly onto the canvas. A present pass is then responsible
   * for drawing the target's color texture onto the canvas.
   */
  renderTarget?: RenderTarget;
}

export const cameraId = createComponentId<CameraEcsComponent>('camera');
