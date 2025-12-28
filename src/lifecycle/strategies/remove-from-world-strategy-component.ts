import { Component } from '../../ecs/index.js';

/**
 * Strategy component that marks an entity to be removed from the world when its lifetime expires.
 * This is a pure data component with no logic - it acts as a marker/tag.
 */
export class RemoveFromWorldStrategyComponent extends Component {}
