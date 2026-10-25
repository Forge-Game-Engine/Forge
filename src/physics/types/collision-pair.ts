/**
 * Two collider entities whose bounds overlap, written by
 * `createBroadPhaseEcsSystem`. `entityA` is the lower entity handle. The
 * broad phase keeps the same object for a pair on every tick it's listed.
 */
export interface CollisionPair {
  readonly entityA: number;
  readonly entityB: number;
}
