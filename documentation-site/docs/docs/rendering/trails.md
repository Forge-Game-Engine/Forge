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

const trail = addTrailComponent(world, ship, {
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
[`MeshEcsComponent`](./meshes.md) to the entity that draws the trail. An
entity has one mesh, so it can't have a trail and another mesh: put the
other mesh on a child entity.

`addTrailComponent` returns the component. The trail system reads its
settings every frame, so a change to one of them changes the trail from the
next frame:

```ts
trail.startWidth = 0.8;
```

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

Colors are straight (not premultiplied) alpha.

## Textures

`texture` lays a texture along the trail, multiplied by its color. It's
laid the way it faces on a sprite: its left edge at the tail and its right
edge at the entity, so a trail moving towards `+X` shows the texture the
same way up as a sprite.

`textureMode` decides how the texture runs along the trail:

- `'stretch'` stretches it once from the tail to the entity.
- `'tile'` repeats it every `tileLength` world units of the path. Each
  repeat stays where it was laid down as the entity moves on, like tire
  tracks. Give the texture `wrap: 'repeat'`:

```ts
const tracks = await renderContext.textureCache.getOrLoad('tracks.png', {
  wrap: 'repeat',
});

addTrailComponent(world, entity, {
  texture: tracks,
  textureMode: 'tile',
  tileLength: 0.5,
});
```

## Draw order

The trail is drawn by its entity's mesh, so it takes the entity's place in
the [draw order](./draw-order.md), and the entity's
`DrawOrderEcsComponent` moves it the same way. An entity's mesh draws
before its sprite and text, so the trail is drawn behind the entity's own
sprite and in front of everything drawn before the entity.

`layer` puts the trail on a draw-order layer, and `category` is matched
against each camera's `cullingMask` to decide which cameras draw it:

```ts
addTrailComponent(world, entity, { layer: -1, category: 1 << 1 });
```

Set `layer` and `category` on the trail, not on its mesh. The trail system
copies them to the mesh every frame, so a value written to the mesh is
overwritten.

To draw a trail in front of its entity's sprite, put the trail on a child
entity, which draws after its parent:

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';

const trailEntity = world.createEntity();

addPositionComponent(world, trailEntity);
addTrailComponent(world, trailEntity);
world.setParent(trailEntity, entity);
```

## Glowing trails

Red, green and blue in `startColor` and `endColor` can be above `1`, for a
trail brighter than white. A camera whose render target is
[HDR](./hdr-rendering.md) keeps those values, and [bloom](./bloom.md) on
the camera makes them glow. A bloom `threshold` of `1` makes only what's
brighter than white glow:

```ts
import {
  addBloomComponent,
  addToneMappingComponent,
  addTrailComponent,
  Color,
  createCamera,
  createRenderTarget,
  RENDER_TARGET_FORMAT,
} from '@forge-game-engine/forge/rendering';

const sceneTarget = createRenderTarget(
  renderContext,
  'canvas',
  RENDER_TARGET_FORMAT.hdr,
);
const camera = createCamera(world, { renderTarget: sceneTarget });

addBloomComponent(world, camera, { threshold: 1 });
addToneMappingComponent(world, camera);

addTrailComponent(world, entity, {
  startColor: new Color(4, 1.6, 0.4, 1),
  endColor: new Color(4, 0.6, 0, 0),
});
```

Register the bloom, tone mapping and present systems after the render
system, as the [bloom](./bloom.md#adding-bloom-to-a-camera) and
[tone mapping](./hdr-rendering.md#tone-mapping-a-camera) guides show. On a
camera whose render target isn't HDR, colors are clamped to `1`, so a trail
brighter than white blooms no more than a white one.

## Turning a trail on and off

Set `emitting` to `false` to stop recording. The trail ends where the
entity was when it stopped, and fades out over `lifetimeSeconds`. Setting it
back to `true` starts a new piece of trail from where the entity is, with
nothing drawn across the gap:

```ts
trail.emitting = false;
```

## Clearing a trail

[`clearTrail`](/Forge/docs/api/functions/clearTrail) removes every point
the trail has recorded at once, where turning `emitting` off leaves them to
fade out. Call it when an entity teleports or respawns, so its trail isn't
drawn across the jump:

```ts
import { clearTrail } from '@forge-game-engine/forge/rendering';

position.local.x = spawnX;
position.local.y = spawnY;
clearTrail(world, entity);
```

The trail system clears the points the next time it runs. The trail starts
again from the entity's new position if it's emitting, and stays empty
until `emitting` is `true` if it isn't.

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
