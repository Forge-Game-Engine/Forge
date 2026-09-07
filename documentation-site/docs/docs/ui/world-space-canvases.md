---
sidebar_position: 2
---

# World-Space Canvases

Pass `renderMode: 'worldSpace'` to put UI content in the game world instead
of overlaid on the screen - diegetic UI like a health bar over an enemy's
head, a name tag, or a floating damage indicator with a persistent rect:

```ts
const healthBarCanvas = createUiCanvas(world, renderContext, time, {
  renderMode: 'worldSpace',
  camera: worldCamera, // the game's own world camera, not a dedicated UI one
  anchor: UiAnchor.center({ x: 80, y: 10 }),
  anchoredPosition: { x: 0, y: 40 }, // 40 units above the enemy's own origin
});

addUiWorldSpaceFollowComponent(world, healthBarCanvas, { target: enemy });

const fill = createPanel(world, healthBarCanvas, {
  anchor: UiAnchor.stretchAll(),
  sprite: fillSprite,
});

world.addSystem(createTransformEcsSystem());
// After createTransformEcsSystem, not before like the rest of the UI
// pipeline - see createUiWorldSpaceFollowEcsSystem's own doc comment.
world.addSystem(createUiWorldSpaceFollowEcsSystem());
```

A world-space canvas's root rect is an ordinary `RectTransformEcsComponent`
- sized via `anchor`/`anchoredPosition` (mirroring `createPanel`'s own
options) rather than the render destination's size. Its offset from the
entity it follows comes from `anchoredPosition` above, not from touching
`PositionEcsComponent` directly - `createUiLayoutEcsSystem` recomputes the
canvas's local position from its anchor every frame, so a manually-set
`PositionEcsComponent.local` would just be overwritten on the next frame.

It draws through whichever camera `camera` names - typically the game's own
world camera - not a dedicated UI camera `createUiCanvas` creates for you,
so it pans and zooms with the world exactly like any other sprite.
`referenceResolution`/`scaleMode`/`cullingMask`/`layer` aren't valid options
for `renderMode: 'worldSpace'` at all - the type checker rejects them,
since there's no "destination size" for a canvas embedded in the world to
scale against, and no dedicated UI camera for them to configure.

**Following, not parenting**: `addUiWorldSpaceFollowComponent`/
`createUiWorldSpaceFollowEcsSystem` overwrites the canvas's world position
every frame with the target's own world position plus the canvas's local
offset, ignoring the target's rotation entirely - unlike
`addParentComponent`, which inherits the target's full world transform
(the ordinary case for, say, a turret mounted on a rotating tank). Use
this so a diegetic UI canvas stays upright above its target regardless of
which way it's facing, instead of swinging around with it. Because
`createUiWorldSpaceFollowEcsSystem` needs the target's world position
already resolved for the current tick, register it yourself, once, right
after `createTransformEcsSystem` - unlike the rest of the UI pipeline,
`createUiCanvas` doesn't register it for you.

`createUiCanvas`'s options are a discriminated union on `renderMode`: the
type checker requires `cullingMask` for the default `'screenSpace'` mode and
`camera` for `'worldSpace'`, and rejects the other mode's fields
(`referenceResolution`/`scaleMode`/`layer` vs. `camera`/`anchor`/
`anchoredPosition`) outright, rather than accepting them and ignoring them
at runtime.
