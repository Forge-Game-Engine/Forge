import { Vector2 } from '../../math/index.js';
import { Collider } from '../colliders/collider.js';

/**
 * The position, rotation, and collider of an entity, as consumed by the
 * narrow-phase collision detectors.
 */
export interface CollisionBody {
  position: Vector2;
  rotation: number;
  collider: Collider;
}
