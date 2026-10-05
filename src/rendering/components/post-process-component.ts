import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { Material } from '../materials/index.js';

/**
 * Runs custom full-screen shaders over the image of whichever camera entity
 * this is attached to. See `createPostProcessEcsSystem`.
 */
export interface PostProcessEcsComponent {
  /**
   * The passes to run, in order, each over the previous pass's output. Each
   * is a full-screen `Material`: the `passthrough.vert` vertex shader with a
   * fragment shader that samples `uniform sampler2D u_texture` at
   * `v_texCoord` and writes the processed color. `u_texture` holds
   * premultiplied alpha, like every render target, and the pass's output is
   * stored the same way.
   *
   * `createPostProcessEcsSystem` sets `u_texture`; set every other uniform
   * yourself, e.g. from a system of your own that animates the effect. To
   * turn an effect off, take its material out of the list: a pass at zero
   * strength still costs a full-screen draw.
   */
  materials: Material[];
}

export const postProcessId =
  createComponentId<PostProcessEcsComponent>('postProcess');

/**
 * Attaches a {@link PostProcessEcsComponent} to a camera entity, so
 * `createPostProcessEcsSystem` runs `materials` over that camera's render
 * target. Has no effect if the entity's camera doesn't have a
 * `renderTarget`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The camera entity to attach the passes to.
 * @param options - The passes to run. `materials` has no sensible default
 * and must always be provided.
 * @returns The attached component, for changing the passes at runtime.
 */
export function addPostProcessComponent(
  world: EcsWorld,
  entity: number,
  options: PostProcessEcsComponent,
): PostProcessEcsComponent {
  return world.addComponent(entity, postProcessId, {
    materials: [...options.materials],
  });
}
