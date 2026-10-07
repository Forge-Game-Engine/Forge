---
sidebar_position: 2
---

# Sprites

A sprite is a textured, rectangular quad drawn at an entity's position. An
entity becomes a sprite when it has a
[`SpriteEcsComponent`](/Forge/docs/api/interfaces/SpriteEcsComponent) and a
position; `createRenderEcsSystem` draws it for every camera whose
`cullingMask` matches its `category`.

## Sprite components

A `SpriteEcsComponent` holds:

- `texture`: the [texture](./textures.md) the sprite draws.
- `width` and `height`: the sprite's size in
  [world units](./world-units-and-cameras.md).
- `pivot`, `uvOffset`, `uvScale` and `tintColor`: where the sprite's origin
  is, which part of the texture it draws, and the color the texture is
  multiplied by.
- `emissive`: an optional emissive map (see
  [Adding an emissive map](#adding-an-emissive-map)).
- `material`: the material the sprite draws with, or `null` for the render
  context's shared `spriteMaterial` (see
  [Drawing sprites with a custom shader](#drawing-sprites-with-a-custom-shader)).
- `category`: which cameras draw the sprite (see
  [Choosing which cameras draw a sprite](#choosing-which-cameras-draw-a-sprite)).
- `layer`: the sprite's draw order (see
  [Setting the draw order](#setting-the-draw-order)).
- `enabled`: whether the sprite is drawn.

The render system reads the entity's world position, rotation and scale, and
its [`FlipEcsComponent`](/Forge/docs/api/interfaces/FlipEcsComponent) if it
has one.

## Creating a sprite from a texture

[`createImageSprite`](/Forge/docs/api/functions/createImageSprite) returns
the options for a sprite that draws a texture, sized from the texture's
texels and `pixelsPerUnit`. Pass them to
[`addSpriteComponent`](/Forge/docs/api/functions/addSpriteComponent):

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import {
  addSpriteComponent,
  createImageSprite,
  createTexture,
} from '@forge-game-engine/forge/rendering';

const playerTexture = createTexture(renderContext, playerImage);
const playerSprite = createImageSprite(playerTexture, { pixelsPerUnit: 32 });

const player = world.createEntity();

addPositionComponent(world, player);
addSpriteComponent(world, player, playerSprite);
```

`createImageSprite` does no GPU work; it only computes the sprite's options.
`addSpriteComponent` copies `pivot`, `uvOffset`, `uvScale` and `slices`, so
one `createImageSprite` result can be added to any number of entities, and
changing one entity's sprite doesn't change the others.

To override a field, spread the result and set it:

```ts
import { Color } from '@forge-game-engine/forge/rendering';

addSpriteComponent(world, player, {
  ...playerSprite,
  tintColor: Color.red,
  layer: 2,
});
```

For a sprite whose corners keep their size as it's resized, pass `slices`
(see [Nine-Slice Sprites](./nine-slice-sprites.md)).

## Drawing a frame of a sprite sheet

For a texture that holds several frames, pass the size of one frame in
texels as `frameDimensions`:

```ts
const runTexture = createTexture(renderContext, runSheetImage, {
  filter: 'nearest',
});

const runSprite = createImageSprite(runTexture, {
  frameDimensions: { x: 32, y: 32 },
  pixelsPerUnit: 32,
});
```

The sprite is sized to one frame, and its `uvScale` is set to the share of
the texture one frame covers. `uvOffset` selects which frame is drawn; the
[sprite animation system](../animations/sprite-animations.md) writes it to
play an animation.

## Drawing a solid-color sprite

A sprite drawn as a flat color uses the render context's
[`whiteTexture`](./textures.md#the-white-and-black-textures) and sets its
color with `tintColor`:

```ts
import { Color } from '@forge-game-engine/forge/rendering';

addSpriteComponent(world, wall, {
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
const doorSprite = addSpriteComponent(
  world,
  door,
  createImageSprite(closedDoorTexture),
);

// Later:
doorSprite.texture = openDoorTexture;
```

The sprite's `width`, `height`, `uvOffset` and `uvScale` don't change. Set
them as well if the new texture has a different size or layout.

## Choosing which cameras draw a sprite

A camera draws a sprite when the sprite's `category` and the camera's
`cullingMask` share at least one bit (`(category & cullingMask) !== 0`).
`category` defaults to `1`, and a camera's `cullingMask` defaults to every
bit, so every camera draws every sprite until you set them. Text uses the
same `category` convention.

```ts
const renderCategories = {
  world: 1 << 0,
  ui: 1 << 1,
};

createCamera(world, { cullingMask: renderCategories.world });
createCamera(world, { cullingMask: renderCategories.ui });

addSpriteComponent(world, healthBar, {
  ...healthBarSprite,
  category: renderCategories.ui,
});
```

The health bar is drawn only by the second camera.

## Setting the draw order

A camera draws its sprites sorted by `layer`, lower layers first, so sprites
in a higher layer are drawn on top. Within a layer, sprites draw by their
entity's [`DrawOrderEcsComponent`](/Forge/docs/api/interfaces/DrawOrderEcsComponent)
and then in hierarchy order: entities created earlier first, and children
after their parents. [Draw Order](./draw-order.md) covers ordering a child
relative to its parent and sorting by height on screen.

`layer` orders sprites drawn by the same camera. The order in which cameras
are composited is the camera's own `layer` (see
[Multipass Rendering](./multipass-rendering.md)).

## Adding an emissive map

An emissive map is light a sprite gives off: a texture sampled at the same
UVs as the sprite's `texture`, multiplied by a color, and added on top of
the tinted texture. `tintColor` doesn't affect it. Set the sprite's
`emissive` to a texture and a color:

```ts
import { Color, createTexture } from '@forge-game-engine/forge/rendering';

addSpriteComponent(world, neonSign, {
  ...neonSignSprite,
  emissive: {
    texture: createTexture(renderContext, neonSignGlowImage),
    color: new Color(4, 1.2, 3, 1),
  },
});
```

The emissive color isn't limited to `1`. Channels above `1` make the glow
brighter than white, which an [HDR](./hdr-rendering.md) camera keeps and
[bloom](./bloom.md#emissive-driven-bloom) spreads into a halo. The emissive
map's alpha is ignored: the sprite's opacity comes from its `texture` alone.
`emissive` defaults to `null`, for no glow.

## Drawing sprites with a custom shader

A [`SpriteMaterial`](/Forge/docs/api/classes/SpriteMaterial) draws sprites
with a fragment shader of your own, paired with the engine's sprite vertex
shader. Register the shader in the render context's `shaderCache`, create
the material with
[`createSpriteMaterial`](/Forge/docs/api/functions/createSpriteMaterial),
and set it as the sprite's `material`:

```ts
import {
  createSpriteMaterial,
  ForgeShaderSource,
} from '@forge-game-engine/forge/rendering';

const dissolveShader = `#version 300 es
#pragma forge name(dissolve.frag)

precision mediump float;

uniform sampler2D u_texture;
uniform float u_progress;

in vec2 v_texCoord;
in vec4 v_tint;
in vec3 v_emissive;
out vec4 fragColor;

void main() {
  vec4 color = texture(u_texture, v_texCoord) * v_tint;

  fragColor = vec4(color.rgb, color.a * (1.0 - u_progress));
}
`;

renderContext.shaderCache.addShader(new ForgeShaderSource(dissolveShader));

const dissolveMaterial = createSpriteMaterial(renderContext, 'dissolve.frag');

dissolveMaterial.setUniform('u_progress', 0.5);

addSpriteComponent(world, enemy, {
  ...enemySprite,
  material: dissolveMaterial,
});
```

The fragment shader receives three inputs from the sprite vertex shader:

- `v_texCoord`: the UV within the sprite's frame of its texture.
- `v_tint`: the sprite's `tintColor`, with its `opacityMultiplier` applied
  to alpha.
- `v_emissive`: the RGB of the sprite's emissive color (black without an
  emissive map).

If the shader declares `uniform sampler2D u_texture`, the render system
binds each sprite's `texture` to it; if it declares
`uniform sampler2D u_emissiveTexture`, it binds the sprite's emissive map,
or the render context's `blackTexture` for a sprite without one. Sprites
with different textures can therefore share one material. Setting either
of these two uniforms on a sprite material throws; change the sprite's
`texture` or `emissive` instead. Set every other uniform with
[`setUniform`](./material-uniforms.md).

A procedural shader that computes its color without sampling the sprite's
texture doesn't need to declare `u_texture`. Give its sprites the render
context's `whiteTexture`, so they batch together.

Sprites whose `material` is `null` draw with the render context's
[`spriteMaterial`](/Forge/docs/api/classes/RenderContext#spritematerial),
which samples `u_texture` and `u_emissiveTexture` as described above.

## Batching

The render system draws consecutive sprites (in draw order) that have the
same material, texture and emissive map texture in one instanced draw call.
Sprites created from the same texture batch with each other wherever they
were created; their tint, size, frame and emissive color can all differ.

A sprite with a different material or texture between two sprites in the
draw order splits them into separate draw calls. To draw many sprites in
few draw calls, give the sprites in a layer the same texture, for example
by packing their images into one sprite sheet and selecting each image with
`uvOffset` and `uvScale`.
