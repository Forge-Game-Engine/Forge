# Common

The `@forge-game-engine/forge/common` module holds the components, systems
and types that several other modules share: an entity's transform, frame
time, and the interfaces engine objects implement.

The module is made of:

- [Time](./time.md): [`Time`](/Forge/docs/api/classes/Time) tracks the
  current frame's delta time, the elapsed time, the frame count and the time
  scale.
- [Transforms](./transforms.md): the
  [`PositionEcsComponent`](/Forge/docs/api/interfaces/PositionEcsComponent),
  [`RotationEcsComponent`](/Forge/docs/api/interfaces/RotationEcsComponent)
  and [`ScaleEcsComponent`](/Forge/docs/api/interfaces/ScaleEcsComponent)
  that place an entity, and
  [`createTransformEcsSystem`](/Forge/docs/api/functions/createTransformEcsSystem),
  which computes their world values.
- [`FlipEcsComponent`](/Forge/docs/api/interfaces/FlipEcsComponent): mirrors
  an entity's sprite horizontally or vertically when it's drawn (see
  [Sprites](../rendering/sprites.md)).
- [`AgeScaleEcsComponent`](/Forge/docs/api/interfaces/AgeScaleEcsComponent)
  and [`createAgeScaleEcsSystem`](/Forge/docs/api/functions/createAgeScaleEcsSystem):
  change an entity's local scale from an original value to a final value
  over its lifetime (its `LifetimeEcsComponent`). The particle module adds it
  to particles.
- [`SpeedEcsComponent`](/Forge/docs/api/interfaces/SpeedEcsComponent): a
  speed value for game systems to read. No engine system reads it.
- [`Path`](/Forge/docs/api/classes/Path), a list of `Vector2` points, and
  [`Space`](/Forge/docs/api/classes/Space), a width and height with a center
  point that raises `onSpaceChange` when it's resized.
- Interfaces implemented by engine objects:
  [`Resizable`](/Forge/docs/api/interfaces/Resizable),
  [`Stoppable`](/Forge/docs/api/interfaces/Stoppable),
  [`Resettable`](/Forge/docs/api/interfaces/Resettable) and
  [`Updatable`](/Forge/docs/api/interfaces/Updatable).
