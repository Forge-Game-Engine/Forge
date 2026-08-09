import { createComponentId } from '@forge-game-engine/forge/ecs';

/**
 * Demo-only component driving the counter label: tracks how many whole
 * seconds have elapsed and how much of the current second has ticked by, so
 * `createCounterEcsSystem` can write a new `Count: N` string into the
 * entity's `TextEcsComponent.text` once per second.
 */
export interface CounterEcsComponent {
  count: number;
  secondsSinceLastTick: number;
}

export const counterId = createComponentId<CounterEcsComponent>('counter');
