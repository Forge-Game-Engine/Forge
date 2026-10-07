import { EcsWorld } from '../../ecs/ecs-world.js';
import { MaskEcsComponent, maskId } from '../../rendering/index.js';

/**
 * Writes `amount` into a control's fill mask: the linear or radial
 * `MaskEcsComponent` on `fill` that reveals the part of the fill its value
 * covers.
 * @param world - The world `fill` belongs to.
 * @param fill - The fill entity.
 * @param amount - The fraction to reveal, `0` to `1`.
 * @param control - The control's name, for the error message.
 * @throws An error if `fill` has no linear or radial mask.
 */
export function driveUiFillMask(
  world: EcsWorld,
  fill: number,
  amount: number,
  control: string,
): void {
  const mask = world.getComponent<MaskEcsComponent>(fill, maskId);

  if (!mask || mask.shape.kind === 'rect') {
    throw new Error(
      `The fill entity ${fill} of a ${control} needs a linear or radial MaskEcsComponent, whose amount the ${control} sets from its value.`,
    );
  }

  mask.shape.amount = amount;
}
