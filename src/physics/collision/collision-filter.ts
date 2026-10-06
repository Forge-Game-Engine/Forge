import { ColliderEcsComponent } from '../components/collider-component.js';

/**
 * Checks whether two colliders' categories and masks let them collide:
 * each one's `category` must share a bit with the other's `mask`. The test
 * is symmetric, so either collider can opt out of the pair.
 * @param a - The first collider.
 * @param b - The second collider.
 * @returns `true` if the pair should be tested for collision.
 */
export function collidersCanCollide(
  a: Pick<ColliderEcsComponent, 'category' | 'mask'>,
  b: Pick<ColliderEcsComponent, 'category' | 'mask'>,
): boolean {
  return (a.category & b.mask) !== 0 && (b.category & a.mask) !== 0;
}
