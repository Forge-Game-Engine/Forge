---
sidebar_position: 6.9
---

# Trails

A trail is a ribbon an entity leaves behind it as it moves, such as
exhaust, a sword swing, a projectile's streak or a cursor's tail. It tapers
and fades from the entity to its tail, and each part of it disappears a set
time after the entity was there.

A trail is a
[`TrailEcsComponent`](/Forge/docs/api/interfaces/TrailEcsComponent) on the
moving entity. The trail system records where the entity goes and draws the
trail as a [ribbon mesh](./ribbon-meshes.md) on the same entity.

## Adding a trail

Add a trail with
[`addTrailComponent`](/Forge/docs/api/functions/addTrailComponent) to an
entity that has a position, and register
[`createTrailEcsSystem`](/Forge/docs/api/functions/createTrailEcsSystem)
after the transform system and before the render system:

```ts
import {
  addPositionComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';
import {
  addTrailComponent,
  Color,
  createRenderEcsSystem,
  createTrailEcsSystem,
} from '@forge-game-engine/forge/rendering';

const ship = world.createEntity();

addPositionComponent(world, ship);
addTrailComponent(world, ship, {
  lifetimeSeconds: 0.6,
  startWidth: 0.4,
  endWidth: 0,
  startColor: new Color(1, 0.6, 0.2, 1),
  endColor: new Color(1, 0.2, 0, 0),
});

world.addSystem(createTransformEcsSystem());
world.addSystem(createTrailEcsSystem(time, renderContext));
world.addSystem(createRenderEcsSystem(renderContext));
```

The trail system reads the entity's world position, so it runs after the
transform system has written it. It adds a
[`MeshEcsComponent`](./meshes.md) to the entity that draws the trail, so the
trail draws in the [draw order](./draw-order.md) with sprites, behind the
entity's own sprite. An entity has one mesh, so it can't have a trail and
another mesh: put the other mesh on a child entity.

That mesh belongs to the trail. Set the trail's `layer` to move it in the
draw order and its `category` to choose which cameras draw it (matched
against each camera's `cullingMask`). The trail system copies both onto the
mesh every frame, so a value written to the mesh itself is overwritten.

## Length and detail

- `lifetimeSeconds` is how long each part of the trail stays. The trail is
  as long as the path the entity took in that time, in game time, so it's
  the same length at any frame rate and follows the
  [time scale](../common/time.md).
- `minVertexDistance` is how far, in world units, the entity moves before
  the trail records a new point. Between points, the trail still reaches
  the entity. A smaller distance follows curves more closely, with more
  vertices.

## Width and color

The trail's width runs from `startWidth` at the entity to `endWidth` at its
tail, in world units, and its color from `startColor` to `endColor`. Each
part of the trail takes its width and color from its age, so a trail whose
entity stops thins and fades where it is.

`widthEasing` and `colorEasing` shape how they change with age: they take
the age as `0` at the entity to `1` at the tail. Any easing function from
the animations module works:

```ts
import { easeInOutSine } from '@forge-game-engine/forge/animations';

addTrailComponent(world, entity, { widthEasing: easeInOutSine });
```

Colors are straight (not premultiplied) alpha. Red, green and blue can be
above `1` to make the trail glow with [bloom](./bloom.md).

## Textures

`texture` lays a texture along the trail, multiplied by its color. It's
laid the way it faces on a sprite: its left edge at the tail and its right
edge at the entity, so a trail moving towards `+X` shows the texture the
same way up as a sprite.

`textureMode` decides how the texture runs along the trail:

- `'stretch'` stretches it once from the tail to the entity.
- `'tile'` repeats it every `tileLength` world units of the path. Each
  repeat stays where it was laid down as the entity moves on, like tire
  tracks. Give the texture `wrap: 'repeat'`.

## Turning a trail on and off

Set `emitting` to `false` to stop recording. The trail ends where the
entity was when it stopped, and fades out over `lifetimeSeconds`. Setting it
back to `true` starts a new piece of trail from where the entity is, with
nothing drawn across the gap.

## Clearing a trail

When an entity teleports or respawns, call
[`clearTrail`](/Forge/docs/api/functions/clearTrail) so its trail isn't
drawn across the jump:

```ts
import { clearTrail } from '@forge-game-engine/forge/rendering';

position.local.x = spawnX;
position.local.y = spawnY;
clearTrail(world, entity);
```

The trail starts again from the entity's new position the next time the
trail system runs.

## Removing a trail

Remove the trail component, or the entity, to remove the trail:

```ts
import { trailId } from '@forge-game-engine/forge/rendering';

world.removeComponent(entity, trailId);
```

The trail's
[remove hook](../ecs/component.md#releasing-what-a-component-holds)
removes the mesh that draws it and frees its GPU geometry, so nothing else
needs cleaning up. Removing the trail system or stopping the world leaves
trails as they are.
