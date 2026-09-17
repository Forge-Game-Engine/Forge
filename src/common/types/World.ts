import { Stoppable } from './Stoppable.js';
import { Updatable } from './Updatable.js';

/**
 * An updatable, stoppable world that a `Game` can update every frame and
 * stop when it stops - typically an `EcsWorld`, but not limited to it.
 */
export type World = Updatable & Stoppable;
