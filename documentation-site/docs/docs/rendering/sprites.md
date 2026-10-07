---
sidebar_position: 2
---

# Sprites

A sprite is a textured rectangle drawn at an entity's position. An entity
is drawn as a sprite when it has a
[`SpriteEcsComponent`](/Forge/docs/api/interfaces/SpriteEcsComponent) and a
position. [`createRenderEcsSystem`](/Forge/docs/api/functions/createRenderEcsSystem)
draws it for every camera whose `cullingMask` matches its `category`.

## The sprite component

A `SpriteEcsComponent` holds:

- `texture`: the [texture](./textures.md) the sprite draws.
- `width` and `height`: the sprite's size in
  [world units](./world-units-and-cameras.md).
- `pivot`: the point of the sprite placed at the entity's position, from
  `(0, 0)` (bottom-left) to `(1, 1)` (top-right). The sprite rotates and
  scales around it.
- `uvOffset` and `uvScale`: the region of the texture the sprite draws.
- `tintColor`: the color the texture is multiplied by.
- `emissive`: an optional emissive map (see
  [Adding an emissive map](#adding-an-emissive-map)).
- `material`: the material the sprite draws with, or `null` for the render
  context's shared `spriteMaterial` (see
  [Drawing sprites with a custom shader](#drawing-sprites-with-a-custom-shader)).
- `category`: which cameras draw the sprite (see
  [Choosing which cameras draw a sprite](#choosing-which-cameras-draw-a-sprite)).
- `layer`: the sprite's place in the draw order (see
  [Setting the draw order](#setting-the-draw-order)).

To hide a sprite, hide its entity with a `VisibilityEcsComponent` (see
[Visibility](./visibility.md)).

The render system places the sprite with the entity's world position,
rotation and scale, and mirrors it with the entity's
[`FlipEcsComponent`](/Forge/docs/api/interfaces/FlipEcsComponent) if it has
one.

## Creating a sprite from a texture

[`createImageSprite`](/Forge/docs/api/functions/createImageSprite) returns
the options for a sprite that draws a texture, sized from the texture's
texels and `pixelsPerUnit` (see
[Importing textures at a fixed PPU](./world-units-and-cameras.md#importing-textures-at-a-fixed-ppu)).
Pass them to
[`addSpriteComponent`](/Forge/docs/api/functions/addSpriteComponent):

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import {
  addSpriteComponent,
  createImageSprite,
} from '@forge-game-engine/forge/rendering';

const texture = await renderContext.textureCache.getOrLoad('ship.png');
const spriteOptions = createImageSprite(texture, { pixelsPerUnit: 32 });

const entity = world.createEntity();

addPositionComponent(world, entity);
addSpriteComponent(world, entity, spriteOptions);
```

`createImageSprite` does no GPU work. `addSpriteComponent` copies the
options' `pivot`, `uvOffset`, `uvScale` and `slices`, so one
`createImageSprite` result can be added to any number of entities, and
changing one entity's sprite doesn't change the others.

To override a field, spread the result and set it:

```ts
import { Color } from '@forge-game-engine/forge/rendering';

addSpriteComponent(world, entity, {
  ...spriteOptions,
  tintColor: Color.red,
});
```

For a sprite whose corners keep their size as it's resized, pass `slices`
(see [Nine-Slice Sprites](./nine-slice-sprites.md)).

## Drawing a frame of a sprite sheet

For a texture that holds several frames, pass the size of one frame in
texels as `frameDimensions`:

```ts
const sheetTexture = await renderContext.textureCache.getOrLoad('hero.png', {
  filter: 'nearest',
});

const frameSpriteOptions = createImageSprite(sheetTexture, {
  frameDimensions: { x: 32, y: 32 },
  pixelsPerUnit: 32,
});
```

The sprite is sized to one frame, and its `uvScale` is set to the share of
the texture one frame covers. `uvOffset` is the top-left corner of the
drawn frame, as a fraction of the texture's size. The
[sprite animation system](../animations/sprite-animations.md) writes
`uvOffset` to play an animation.

## Drawing a solid-color sprite

A sprite drawn as a flat color uses the render context's
[`whiteTexture`](./textures.md#the-white-and-black-textures) and sets its
color with `tintColor`:

```ts
import { Color } from '@forge-game-engine/forge/rendering';

addSpriteComponent(world, entity, {
  texture: renderContext.whiteTexture,
  width: 4,
  height: 1,
  tintColor: Color.blue,
});
```

## Changing a sprite's image

To change the image a sprite draws, assign another texture to its
`texture`:

```ts
const sprite = addSpriteComponent(
  world,
  entity,
  createImageSprite(firstTexture),
);

sprite.texture = secondTexture;
```

The sprite's `width`, `height`, `uvOffset` and `uvScale` don't change. Set
them as well if the new texture has a different size or layout.

## Choosing which cameras draw a sprite

A camera draws a sprite when the sprite's `category` and the camera's
`cullingMask` share at least one bit (`(category & cullingMask) !== 0`).
`category` defaults to `1`, and a camera's `cullingMask` defaults to every
bit, so every camera draws every sprite until you set them. Text has a
`category` too, and matches the same way.

```ts
const renderCategories = {
  world: 1 << 0,
  ui: 1 << 1,
};

createCamera(world, { cullingMask: renderCategories.world });
createCamera(world, { cullingMask: renderCategories.ui });

addSpriteComponent(world, entity, {
  ...spriteOptions,
  category: renderCategories.ui,
});
```

The sprite is drawn only by the second camera.

## Setting the draw order

A camera draws sprites with a lower `layer` first, so sprites with a higher
`layer` are drawn on top:

```ts
addSpriteComponent(world, entity, { ...spriteOptions, layer: 1 });
```

Within a layer, sprites draw in hierarchy order unless a
`DrawOrderEcsComponent` moves them. [Draw Order](./draw-order.md) covers
hierarchy order, ordering a child relative to its parent, and sorting by
height on screen.

## Adding an emissive map

An emissive map is light a sprite gives off: a texture sampled at the same
UVs as the sprite's `texture`, multiplied by a color, and added to the
tinted texture. `tintColor` doesn't affect it. Set the sprite's `emissive`
to a texture and a color:

```ts
import { Color } from '@forge-game-engine/forge/rendering';

addSpriteComponent(world, entity, {
  ...spriteOptions,
  emissive: {
    texture: await renderContext.textureCache.getOrLoad('ship-emissive.png'),
    color: new Color(4, 1.2, 3, 1),
  },
});
```

Color channels above `1` make the emitted light brighter than white, which
an [HDR](./hdr-rendering.md) camera keeps and
[bloom](./bloom.md#emissive-driven-bloom) spreads into a halo. The emissive
map's alpha isn't used: the sprite's opacity comes from its `texture` and
`tintColor` alone.

## Drawing sprites with a custom shader

A [`SpriteMaterial`](/Forge/docs/api/classes/SpriteMaterial) draws sprites
with your own fragment shader, paired with the engine's sprite vertex
shader. Register the shader in the render context's `shaderCache`, create
the material with
[`createSpriteMaterial`](/Forge/docs/api/functions/createSpriteMaterial),
and set it as the sprite's `material`:

```ts
import {
  createSpriteMaterial,
  ForgeShaderSource,
} from '@forge-game-engine/forge/rendering';

const fadeShader = `#version 300 es
#pragma forge name(fade.frag)

precision mediump float;

uniform sampler2D u_texture;
uniform float u_fade;

in vec2 v_texCoord;
in vec4 v_tint;
in vec3 v_emissive;
out vec4 fragColor;

#pragma forge include(spriteMask)

void main() {
  vec4 color = texture(u_texture, v_texCoord) * v_tint;

  fragColor = vec4(
    color.rgb,
    color.a * (1.0 - u_fade) * spriteMaskCoverage()
  );
}
`;

renderContext.shaderCache.addShader(new ForgeShaderSource(fadeShader));

const fadeMaterial = createSpriteMaterial(renderContext, 'fade.frag');

fadeMaterial.setUniform('u_fade', 0.5);

addSpriteComponent(world, entity, {
  ...spriteOptions,
  material: fadeMaterial,
});
```

The fragment shader receives three inputs from the sprite vertex shader:

- `v_texCoord`: the UV within the sprite's region of its texture.
- `v_tint`: the sprite's `tintColor`, with its alpha multiplied by the
  sprite's `opacityMultiplier` when that's set.
- `v_emissive`: the RGB of the sprite's emissive color (black without an
  emissive map).

Every sprite fragment shader must include `spriteMask` and multiply its
output alpha by `spriteMaskCoverage()`, which is how much of the fragment
the sprite's [masks](./masks.md) let through (`1` for an unmasked sprite).
`createSpriteMaterial` throws for a shader that doesn't include it.

If the shader declares `uniform sampler2D u_texture`, the render system
binds each sprite's `texture` to it. If it declares
`uniform sampler2D u_emissiveTexture`, the render system binds the
sprite's emissive map, or the render context's `blackTexture` for a sprite
without one. Sprites with different textures can therefore share one
material. Setting either of these two uniforms on a sprite material
throws; change the sprite's `texture` or `emissive` instead. Set every
other uniform with [`setUniform`](./material-uniforms.md).

A shader that computes its color without sampling the sprite's texture
doesn't need to declare `u_texture`. Give its sprites the render context's
`whiteTexture`, so they batch together.

## Batching

The render system draws consecutive sprites (in draw order) that have the
same material, texture and emissive map texture in one instanced draw call.
Their tint, size, frame and emissive color can differ.

A sprite with a different material or texture between two sprites in the
draw order splits them into separate draw calls. To draw many sprites in
few draw calls, give the sprites in a layer the same texture, for example
by packing their images into one sprite sheet and selecting each image with
`uvOffset` and `uvScale`.

## Hiding and removing a sprite

To stop drawing a sprite and keep its component, hide its entity with a
`VisibilityEcsComponent` (see [Visibility](./visibility.md)).

To remove the sprite from the entity, remove its component:

```ts
import { spriteId } from '@forge-game-engine/forge/rendering';

world.removeComponent(entity, spriteId);
```

Removing the sprite doesn't dispose its texture or material.
