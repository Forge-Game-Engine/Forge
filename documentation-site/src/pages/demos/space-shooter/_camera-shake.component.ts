import { Vector2 } from '@forge-game-engine/forge/math';
import { createComponentId } from '@forge-game-engine/forge/ecs';

export interface CameraShakeEcsComponent {
  intensity: number;
  durationSeconds: number;
  elapsedSeconds: number;

  /**
   * The offset currently applied to the camera's world position. Held
   * constant for a few frames at a time (see `_camera-shake.system.ts`) so
   * the shake reads as a series of discrete jolts instead of high-frequency
   * noise that blurs together at 60fps.
   */
  currentOffset: Vector2;

  /** `elapsedSeconds` value at which `currentOffset` should next be re-rolled. */
  nextOffsetChangeSeconds: number;
}

export const cameraShakeId =
  createComponentId<CameraShakeEcsComponent>('cameraShake');
