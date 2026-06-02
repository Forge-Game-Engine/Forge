---
sidebar_position: 2
---

# Property animations

Property animations interpolate numeric values over time. Use them for position, scale, opacity, or any numeric parameter.

## Defining animated properties

Create an `animation` component with `properties` entries. Each entry specifies `key`, `from`, `to`, `duration` (ms), optional `easing`, and loop behavior.

```ts
entity.addComponent(animationComponent({
  properties: [
    { key: 'alpha', from: 0, to: 1, duration: 400, easing: easeInOutSine }
  ]
}));
world.addSystem(createAnimationEcsSystem(time));
```

## Easing

Pick an easing function that matches the motion you want. Available functions include `linear`, `easeInOutSine`, `easeInBack`, `easeInOutQuint`, `easeInOutElastic`, and `easeInOutBack`.

```ts
import { easeInOutSine } from '...';

property.easing = easeInOutSine;
```

## Looping and ping-pong

Set `loop` to `'loop'` or `'pingpong'` and control repetition with `loopCount` (-1 for infinite). The system updates `elapsed` each tick and calls `updateCallback(value)` with the eased progress.

## Notes and troubleshooting

- Avoid `duration` of zero; the system expects positive durations.
- Factory helpers apply sensible defaults but user-provided values take precedence.
- If an animation finishes immediately, inspect `duration`, `elapsed`, and `easing` values.
