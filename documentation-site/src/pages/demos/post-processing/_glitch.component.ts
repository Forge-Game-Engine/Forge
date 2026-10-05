import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Material } from '@forge-game-engine/forge/rendering';

/**
 * Times the glitch pass's bursts. Goes on the camera whose
 * `PostProcessEcsComponent` runs `material`.
 */
export interface GlitchEcsComponent {
  /** The glitch pass, whose uniforms `createGlitchEcsSystem` animates. */
  material: Material;

  isBursting: boolean;

  /** Until the current calm spell or burst ends. */
  secondsLeft: number;

  /** Until the tears next jump to new bands. */
  secondsUntilStep: number;
}

export const glitchId = createComponentId<GlitchEcsComponent>('glitch');

export const addGlitchComponent = (
  world: EcsWorld,
  camera: number,
  material: Material,
): GlitchEcsComponent =>
  world.addComponent(camera, glitchId, {
    material,
    isBursting: false,
    secondsLeft: 1,
    secondsUntilStep: 0,
  });
