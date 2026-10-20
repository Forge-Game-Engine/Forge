---
sidebar_position: 2.25
---

# Texture Atlases

A texture atlas is one texture holding many images, and the list of named
regions that says where each image is. Sprites made from regions of one
atlas share its texture, so consecutive ones draw in one instanced draw
call (see [Batching](./sprites.md#batching)).

## Atlases and regions

A [`TextureAtlas`](/Forge/docs/api/interfaces/TextureAtlas) holds:

- `texture`: the [texture](./textures.md) every region samples.
- `regions`: the atlas's
  [`AtlasRegion`](/Forge/docs/api/interfaces/AtlasRegion)s, in the order
  they were given.
- `scale`: how many texels of the texture make up one pixel of the art it
  was packed from. It's `1` unless the atlas was exported at another size
  (see [Export scale](#export-scale)).

An `AtlasRegion` is a [`TextureRegion`](./sprites.md#texture-regions) (its
UV rect and trim) with three more fields:

- `name`: the region's name, unique within its atlas.
- `sourceSize`: the size of the region's untrimmed frame, in texels.
- `pivot`: the origin of a sprite made from the region, normalized to the
  untrimmed frame: `(0, 0)` is its top-left corner and `(0.5, 0.5)` its
  center.

Atlases and regions can't be changed after they're created, so any number
of sprites and animation clips share the same region objects.

## Creating an atlas from texel rects

[`createTextureAtlas`](/Forge/docs/api/functions/createTextureAtlas) takes
a texture and one rect per region, in texels from the texture's top-left
corner, as atlas packers write them:

```ts
import { createTextureAtlas } from '@forge-game-engine/forge/rendering';

const texture = await renderContext.textureCache.getOrLoad('items.png');

const itemsAtlas = createTextureAtlas(texture, [
  { name: 'coin', x: 0, y: 0, width: 16, height: 16 },
  { name: 'gem', x: 16, y: 0, width: 16, height: 16 },
  { name: 'key', x: 32, y: 0, width: 32, height: 16 },
]);
```

Each region's UVs are the rect's exact texel edges divided by the
texture's size, which is read when the atlas is created. Every texel value
must be a whole number, and every rect must lie inside the texture.

:::caution
`createTextureAtlas` throws for a texture whose size is `0`, such as one
whose image hasn't loaded, for an empty list, for an empty or repeated
name, and for a rect that isn't whole texels or reaches outside the
texture.
:::

The atlas doesn't own its texture. If the texture's image is replaced with
one of another size, create a new atlas for it.

## Trimmed regions and pivots

Atlas packers trim the transparent border off each image. For a trimmed
image, give the untrimmed frame's size as `sourceWidth` and
`sourceHeight`, and the packed rect's position inside that frame as
`trimX` and `trimY`:

```ts
const heroAtlas = createTextureAtlas(texture, [
  {
    name: 'hero_idle_0',
    // The packed, trimmed rect in the texture.
    x: 64,
    y: 0,
    width: 20,
    height: 30,
    // The 32 x 32 frame it was trimmed from, and where the rect sat in it.
    sourceWidth: 32,
    sourceHeight: 32,
    trimX: 6,
    trimY: 2,
    pivot: { x: 0.5, y: 1 },
  },
]);
```

A rect without `sourceWidth` and `sourceHeight` is untrimmed. `pivot`
defaults to `(0.5, 0.5)`, and may lie outside `0` to `1`. The `pivot` above
is the bottom center of the frame, for example a character's feet.

## Creating a grid atlas

[`createGridTextureAtlas`](/Forge/docs/api/functions/createGridTextureAtlas)
cuts a texture into equally sized cells, such as a sprite sheet or a
tileset:

```ts
import { createGridTextureAtlas } from '@forge-game-engine/forge/rendering';

const tilesAtlas = createGridTextureAtlas(texture, {
  cellWidth: 32,
  cellHeight: 32,
  spacing: 2,
  margin: 1,
});
```

Cells start `margin` texels in from the texture's left and top edges and
are `spacing` texels apart. The regions are in row-major order (left to
right, then the next row down) and named by index: `'0'`, `'1'`, and so on.
They're untrimmed and pivoted at their center.

`columns` and `rows` default to as many whole cells as fit in the texture;
a partial column or row at the right or bottom edge is left out. Give them
to cut fewer.

## Loading a TexturePacker atlas

[`TextureAtlasCache`](/Forge/docs/api/classes/TextureAtlasCache) loads an
atlas from a TexturePacker "JSON (Hash)" or "JSON (Array)" file and the
image exported with it. free-tex-packer and Aseprite's sprite sheet export
write the same format. Pass the URLs your bundler gives you for both files:

```ts
import { TextureAtlasCache } from '@forge-game-engine/forge/rendering';
import heroDataUrl from './hero.json?url';
import heroImageUrl from './hero.png';

const atlasCache = new TextureAtlasCache(renderContext);

const heroAtlas = await atlasCache.getOrLoad(
  { dataUrl: heroDataUrl, imageUrl: heroImageUrl },
  { filter: 'nearest' },
);
```

Each frame in the file becomes a region named by its key (hash) or its
`filename` (array), with the frame's trim and `pivot`. Names are kept as
written, so a frame exported as `hero_idle_0.png` is looked up as
`'hero_idle_0.png'`; TexturePacker's "Trim sprite names" option drops the
extension. The texture comes from `renderContext.textureCache`, so an atlas
and a sprite loaded from the same image with the same `filter` share one
texture. `filter` defaults
to `'linear'`; pixel art needs `'nearest'`.

Atlases are cached by `dataUrl`: later and concurrent calls return the same
atlas, and `atlasCache.get(dataUrl)` returns one that has finished loading.

Export the atlas with these settings:

- Rotation off. A rotated frame throws.
- Premultiplied alpha off. Forge uploads textures with straight alpha, and
  can't tell from the PNG that its colors were premultiplied.
- One image per file. A multi-page file throws; export each page as its own
  file and load each as its own atlas.

:::caution
The promise rejects if the JSON is invalid (the message names the frame
and field), if the image's size isn't the file's `meta.size`, or if the
same `dataUrl` was already requested with another `imageUrl` or `filter`.
:::

In the hash form, frames whose names are whole numbers (`"0"`, `"12"`)
come first in `regions`, in numeric order. Look regions up by name, or
export as "JSON (Array)" when their order matters.

## Creating an atlas from TexturePacker JSON

[`parseTexturePackerAtlas`](/Forge/docs/api/functions/parseTexturePackerAtlas)
reads JSON a game already has, such as a bundler's JSON import, into texel
rects. [`createTexturePackerAtlas`](/Forge/docs/api/functions/createTexturePackerAtlas)
makes an atlas from them and the image's texture:

```ts
import {
  createTexturePackerAtlas,
  parseTexturePackerAtlas,
} from '@forge-game-engine/forge/rendering';
import heroJson from './hero.json';

const texture = await renderContext.textureCache.getOrLoad(heroImageUrl);

const heroAtlas = createTexturePackerAtlas(
  texture,
  parseTexturePackerAtlas(heroJson),
);
```

`createTexturePackerAtlas` throws if the texture isn't the size the file
declares, and sets the atlas's `scale` from the file's `meta.scale`.

## Export scale

An atlas exported at twice the art's size (an `@2x` export) has a `scale`
of `2`: its regions are twice as many texels as the art's pixels.
`TextureAtlasCache` and `createTexturePackerAtlas` read it from the file's
`meta.scale`; pass `{ scale }` as `createTextureAtlas`'s third argument
for an atlas built from rects. `createAtlasSprite` divides region sizes by
it, so the same `pixelsPerUnit` gives sprites the same world size at every
export scale.

## Looking up a region

- [`getRegion(name)`](/Forge/docs/api/interfaces/TextureAtlas#getregion)
  returns the region with that name. It throws for a missing name, listing
  up to three close names.
- [`hasRegion(name)`](/Forge/docs/api/interfaces/TextureAtlas#hasregion)
  returns whether a region has that name.
- [`getRegionAt(index)`](/Forge/docs/api/interfaces/TextureAtlas#getregionat)
  returns `regions[index]`. It throws for an index outside the list.

```ts
const coin = itemsAtlas.getRegion('coin');
const sixthTile = tilesAtlas.getRegionAt(5);
```

A region can be assigned to any sprite whose `texture` is the atlas's
texture:

```ts
sprite.region = itemsAtlas.getRegion('gem');
```

## Creating a sprite from a region

[`createAtlasSprite(atlas, region, options)`](/Forge/docs/api/functions/createAtlasSprite)
returns the options for a sprite that draws one region. `region` is a name
or an index. Pass the result to `addSpriteComponent`:

```ts
import {
  addSpriteComponent,
  createAtlasSprite,
} from '@forge-game-engine/forge/rendering';

addSpriteComponent(
  world,
  entity,
  createAtlasSprite(itemsAtlas, 'coin', { pixelsPerUnit: 16 }),
);
```

The sprite's `texture` is the atlas's texture and its `region` is the
atlas's region object. Its `width` and `height` are the region's
`sourceSize` divided by the atlas's `scale` and by `pixelsPerUnit`
(default `100`), so a trimmed region draws its share of the untrimmed
frame. Its `pivot` is a copy of the
region's.

A sprite animation assigns each frame's region to the sprite's `region`
and leaves `width`, `height` and `pivot` as they are, so every frame of a
clip is drawn inside the size and pivot of the sprite it plays on.

## Nine-slicing an atlas region

Pass `slices` to `createAtlasSprite` to
[nine-slice](./nine-slice-sprites.md) a region. The insets are in world
units at `pixelsPerUnit`, and the native size defaults to the region's
world size:

```ts
const panelSprite = createAtlasSprite(uiAtlas, 'panel', {
  pixelsPerUnit: 1,
  slices: { left: 12, right: 12, top: 12, bottom: 12 },
});
```

The grid is cut from the region's rect in the atlas, so the corners and
edges sample only that region. The result can be passed to `createPanel`
and `createButton` as their `sprite`.

:::caution
`createAtlasSprite` throws for `slices` on a trimmed region: nine-slice
insets are measured against the untrimmed art.
:::

## Filtering at region edges

A sprite drawing a region of a texture whose `wrap` is `'clamp'` (the
default) samples only that region: its outermost half texel repeats the
region's edge texels, the way a whole clamped texture repeats its own. So
with `'linear'` filtering, at any scale, a region never blends in its
neighbors in the sheet, and tiles cut from a sheet with no spacing between
them draw side by side without seams. A sprite's emissive map is sampled
inside the same rect, so give it the texture's size.

A region of a texture whose `wrap` is `'repeat'` isn't limited this way, so
that its UV rect can tile or scroll the texture.
