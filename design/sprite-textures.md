# Design: Sprites Reference Textures, Not Draw Pipelines

|                                       |                                                                                                                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                            | Draft, for review                                                                                                                                                                                                                                                        |
| **Kind**                              | Defect and feature                                                                                                                                                                                                                                                       |
| **Found in**                          | Galactic Journey demo: `src/ui/create-qr-code.ts`, `src/main-menu/create-how-to-play-panel.ts`, `src/speed/create-hud.ts`, `src/engine-flame/*`, `src/shockwave/create-displacement-map.ts`, `src/ui/create-ui.ts`, `src/background/create-background.ts`, `src/explosions/create-explosions.ts` |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                                                                                 |
| **Related**                           | [`shader-uniform-declarations.md`](./shader-uniform-declarations.md), [`sprite-fill.md`](./sprite-fill.md), [`webgl-context-loss.md`](./webgl-context-loss.md)                                                                                                            |

## 0. Targeted modules

| Path                                                   | Change   | Notes                                                                                             |
| ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------- |
| `src/rendering/texture.ts`                             | **New**  | `Texture` and `createTexture`: from any `TexImageSource`, updatable, disposable                   |
| `src/rendering/materials/material.ts`                  | Modified | Materials with the same shaders share one linked program; sampler uniforms take a `Texture`       |
| `src/rendering/materials/create-sprite-material.ts`    | **New**  | A material for a custom sprite fragment shader, paired with `sprite.vert`                         |
| `src/rendering/components/sprite-component.ts`         | Modified | `texture`, `material` and `category` replace `renderable`; vector fields copied per component     |
| `src/rendering/utilities/create-image-sprite.ts`       | Modified | Takes a `Texture`, does no GL work; `emissiveMap` moves to a material                             |
| `src/rendering/systems/render-system.ts`               | Modified | Batches by material and texture; owns the sprite geometry and instance layout                     |
| `src/rendering/render-context.ts`                      | Modified | Holds the default sprite material, the program cache and a white `Texture`                        |
| `src/text/**`                                          | Modified | Font atlases become `Texture`s; glyphs use the same batching                                      |
| `documentation-site/docs/docs/rendering/*.md`, demos   | Modified | Every `createImageSprite` and hand-built `Renderable`                                             |

---

## 1. Summary

A sprite today holds a `Renderable`: a geometry, a material (a compiled
and linked shader program plus its uniform values), and the instance
layout. `createImageSprite(image, ...)` builds all of that for each image
it's given, so:

- **Every image compiles and links the sprite shaders again.** The demo's
  HUD alone calls `createImageSprite` for 47 images, and its UI for dozens
  of icons. Each is a new program, a new quad geometry and a new texture,
  and none of them is ever freed.
- **Sprites batch by `Renderable`**, so two sprites of different images
  never share a draw call, even with the same shader.
- **An image is welded to a pipeline.** To show a different image on an
  entity, the demo swaps `sprite.renderable` for another prebuilt one (the
  how-to-play pages, the boosted engine flames, the HUD's speed meter). To
  show an image made at runtime (the leaderboard's QR code), it creates a
  texture with `createTextureFromImage`, sets it on a renderable's
  material, and deletes the previous texture with raw GL.
- **There's no way to make a texture from pixels.** The shockwave's
  displacement map is uploaded with raw `gl.createTexture`/`texImage2D`
  calls.
- **There's no solid-color sprite.** The demo builds a 4x4 white SVG to
  tint, although the engine has a white texture internally.
- **The render category lives on the `Renderable`** (`createImageSprite`'s
  `layer` option), so the same image shown to two cameras with different
  culling masks needs two programs. Text already has its own `category`.
- **Sprites built from one template share their vectors.**
  `addSpriteComponent` copies the options shallowly, so every entity built
  from one `createImageSprite` result shares its `pivot`, `uvOffset` and
  `uvScale` objects. The sprite animation system writes `uvOffset` in
  place, so two animated entities from one template overwrite each other's
  frame. The demo gives each explosion a fresh `uvOffset` by hand.
- **Custom shaders need the whole pipeline by hand.** The demo's
  background and three docs-site demos build a `Renderable` from
  `createQuadGeometry`, `combineInstanceDataSegments` and
  `spriteInstanceDataSegment` to draw a sprite with their own fragment
  shader.

The fix separates the three things a `Renderable` bundles: what to draw
(a `Texture`), how to draw it (a `Material`, whose program is shared), and
the quad and instance layout (the render system's business). This is how
every engine's 2D renderer is organized.

---

## 2. Scope

### In scope

- `Texture`: created from images, canvases, `ImageData` and
  `ImageBitmap`; updatable; disposable; sampling options.
- Shared programs for materials with the same shaders.
- `SpriteEcsComponent` referencing `texture`, optional `material`, and
  `category`.
- `createSpriteMaterial` for custom sprite fragment shaders.
- Batching by material and texture.
- `addSpriteComponent` copying vector fields.
- A white texture for solid-color sprites.
- Migrating text, UI builders, particles, docs demos, e2e scenes.

### Out of scope

- **Texture atlases and sprite packing.** With batching by texture, packing
  images into one texture is how a game gets fewer draw calls. It's a
  build-time tool question, separate from this.
- **Asset reference counting.** Textures are owned and disposed by whoever
  created them (§4.1). Automatic lifetime (Bevy's handles, Godot's
  ref-counted resources) can come later if ownership turns out to be hard
  to follow.
- **Float and compressed texture formats.** Only 8-bit RGBA, as today.
- **Restoring textures after a lost WebGL context.** See
  [`webgl-context-loss.md`](./webgl-context-loss.md), which builds on
  `Texture` keeping its source.

---

## 3. How established engines handle this

- **Unity**: a `SpriteRenderer` references a `Sprite` (a `Texture2D` plus a
  rect, pivot and pixels per unit) and a `Material`. All sprites share the
  default sprite material and its shader unless given another. Textures
  can be created from pixels (`new Texture2D` + `SetPixels32` + `Apply`)
  and freed with `Destroy`. Sprites with the same material and texture
  batch.
- **Godot**: `Sprite2D.texture` is a `Texture2D` resource; swapping it
  swaps the image. `ImageTexture.create_from_image` makes one from pixels.
  Custom shaders are a `ShaderMaterial` on the node; the default canvas
  material is shared. Batching is by texture and material.
- **Bevy**: `Sprite { image: Handle<Image>, .. }`. `Image::new` makes one
  from raw data. Custom 2D shaders are a `Material2d`, which supplies a
  fragment shader and reuses the default vertex shader and mesh. One
  pipeline per material type; batching by image.

All three: a sprite names a texture; a material is a shared shader plus
values; the quad and instance layout belong to the renderer.

---

## 4. Design

### 4.1 Textures

```ts
interface TextureOptions {
  /** `'linear'` (default) or `'nearest'` for pixel art. */
  filter: TextureFilter;
  /** `'clamp'` (default) or `'repeat'`. */
  wrap: TextureWrap;
}

class Texture {
  readonly width: number;
  readonly height: number;
  /** Replaces the texture's contents (and size) with `source`. */
  update(source: TexImageSource): void;
  /** Frees the GPU texture. Using it afterwards throws. */
  dispose(): void;
}

function createTexture(
  renderContext: RenderContext,
  source: TexImageSource,
  options?: Partial<TextureOptions>,
): Texture;
```

`TexImageSource` covers images, canvases, `ImageData`, `ImageBitmap` and
video frames, so a texture made from pixels is
`createTexture(renderContext, new ImageData(pixels, width, height))`.

Whoever creates a texture owns it and disposes it when nothing uses it any
more. `renderContext.whiteTexture` is a 1x1 white texture owned by the
render context, for solid-color sprites.

### 4.2 Materials share programs

A `Material` is a program plus uniform values. Materials made from the same
vertex and fragment shaders share one linked program, cached by the render
context's shader cache, so creating a material is cheap and the compile
happens once per shader pair (this resolves the "shader cache for compiled
shaders" TODO in `material.ts`). Sampler uniforms take a `Texture`.

`createSpriteMaterial(renderContext, fragmentShaderName)` returns a
material pairing `sprite.vert` with the named fragment shader. The render
system binds the sprite's texture to the material's `u_texture` uniform
for each batch, so a custom sprite shader declares `u_texture` and doesn't
set it.

`renderContext.spriteMaterial` is the default, shared by every sprite that
doesn't name one.

### 4.3 The sprite component

```ts
interface SpriteRequiredOptions {
  width: number;
  height: number;
  texture: Texture;
}

interface SpriteDefaultedOptions {
  /** `null`: the render context's `spriteMaterial`. */
  material: Material | null;
  /** Matched against each camera's `cullingMask`, as `TextEcsComponent.category` is. */
  category: number;
  // pivot, tintColor, uvOffset, uvScale, enabled, layer, ... as today
}
```

`renderable` is removed. Changing `sprite.texture` changes the image;
`uvOffset`/`uvScale` still select a frame within it.

`addSpriteComponent` copies `pivot`, `uvOffset`, `uvScale` and `slices`
into new objects, so each component owns its data however the options
were built. The `{ ...sprite }` spreads and fresh vectors callers write
today become unnecessary.

### 4.4 `createImageSprite`

`createImageSprite(texture, options)` computes a sprite's options from a
texture: `width` and `height` from `pixelsPerUnit` and `frameDimensions`,
the frame's `uvScale`, and nine-slice native sizes. It does no GL work and
needs no render context. `pixelated` moves to the texture's `filter`, the
render `layer` option becomes the sprite's `category`, and `emissiveMap`
becomes a material: the default sprite fragment shader keeps its emissive
uniforms, so an emissive sprite uses
`createSpriteMaterial(renderContext, 'sprite.frag')` with
`u_emissiveTexture`, `u_emissiveColor` and `u_emissiveIntensity` set.

### 4.5 Rendering

The render system owns one quad geometry and the sprite instance layout
per render context. Commands are sorted as today (layer, then depth) and
consecutive commands with the same material and texture form one
instanced draw. Text glyphs go through the same path: a font atlas is a
`Texture`, drawn with the MSDF materials, and `TextEcsComponent.category`
works as now.

`Renderable` stays as the render system's internal batch description;
it's no longer part of the public sprite API.

---

## 5. Phases

### Phase 1: Textures and shared programs

| #   | Task                                                                                         | Size |
| --- | -------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `Texture`, `createTexture`, `update`, `dispose`, `renderContext.whiteTexture`                | M    |
| 1.2 | Program cache by shader pair; `Material` uses it; sampler uniforms accept `Texture`          | M    |
| 1.3 | Tests: shared programs, texture update and dispose, use after dispose throws                 | S    |

**Definition of done:** creating two materials from the same shaders links
one program; a texture can be created from `ImageData` and updated.

### Phase 2: Sprites reference textures

| #   | Task                                                                                                        | Size |
| --- | ----------------------------------------------------------------------------------------------------------- | ---- |
| 2.1 | `SpriteEcsComponent` `texture`/`material`/`category`; `renderable` removed; vector fields copied            | M    |
| 2.2 | `createImageSprite(texture, options)`; `createSpriteMaterial`; default sprite material on the render context | M    |
| 2.3 | Render system: internal geometry and layout; batching by material and texture; culling by sprite category   | L    |
| 2.4 | Text: font atlas `Texture`; glyph batching through the same path                                            | M    |
| 2.5 | Migrate `/src` (UI builders, particles, nine-slice), docs-site demos, e2e scenes                            | L    |
| 2.6 | Guides (`rendering/*`, `material-uniforms.md`, `bloom.md` emissive section); changelog under `#### Changed` | M    |

**Definition of done:** no public API takes or returns a `Renderable`;
sprites of the same texture and material in sequence draw in one call; the
docs demos and e2e suite pass; a sprite's image can be changed by
assigning `texture`.

Phase 1 is useful on its own (custom materials stop recompiling, and the
QR code and displacement map stop using raw GL); Phase 2 is the breaking
change.

---

## 6. Decision log

### DL-1: Sampling options live on the texture

**Options.** (a) On the texture (Unity's import settings). (b) Per sprite,
with WebGL2 sampler objects (Godot 4's `texture_filter` on the node).

**Decision: (a).**

**Rationale.** It's today's behavior (`pixelated` is fixed when the
texture is created), keeps the batch key to material and texture, and a
game wanting both filters for one image can create two textures. (b) is
worth revisiting if that turns out to be common.

### DL-2: Callers own textures

**Options.** (a) Explicit `dispose`. (b) Reference counting with handles.

**Decision: (a).**

**Rationale.** It matches how `RenderTarget` and other GPU objects work in
Forge today. The demo's QR code is the only place that swaps textures at
runtime, and it already disposes the old one. (b) is a larger asset-system
change; see "Out of scope".

### DL-3: The category moves to the sprite

**Rationale.** Which cameras draw an entity is a property of the entity,
like Unity's GameObject layer and Bevy's `RenderLayers`. It was on the
`Renderable` only because the renderable was per image. Text already has
its own `category` field, and sprites now match it.

### DL-4: `addSpriteComponent` copies vector fields

**Options.** (a) Copy in the factory. (b) Document that callers must
clone.

**Decision: (a).**

**Rationale.** The factory that attaches a component is the one place
that knows which of its fields are mutable objects. (b) is the status quo,
and the demo's fresh `uvOffset` per explosion shows it isn't followed.

---

## 7. Open questions

1. **Should `createImageSprite` be renamed** now that it takes a
   `Texture`? It builds sprite options from a texture's size.
   - (a) Keep the name (proposed). (b) `createSpriteOptions`.
2. **Should emissive maps be a sprite field** rather than a material
   uniform? As a material, each emissive image needs its own material,
   which is fine while they're rare.
   - (a) Material (proposed). (b) `SpriteEcsComponent.emissive`.

---

## 8. Testing considerations

- `Texture`: creation from each source type the unit tests can mock;
  `update` re-uploads; `dispose` deletes and later use throws.
- Program cache: two materials, one link; different shaders, two.
- Render system: batch boundaries at material or texture changes;
  category culling; a sprite whose `texture` changes draws the new one.
- `addSpriteComponent`: two components from one options object don't
  share vectors.
- e2e: the existing rendering scenes migrate; one renders two sprites
  from one texture and asserts both appear, using the relative
  measurement pattern from `AGENTS.md`.

## 9. Documentation and demo follow-up

- Guides: textures (creating, updating, disposing), sprite materials,
  categories; every sample moves from `renderable` to `texture`.
- Demo: the QR code updates one `Texture`; the how-to-play pages, boosted
  flames and HUD assign `sprite.texture`; the displacement map and the
  white SVG become `createTexture` and `renderContext.whiteTexture`; the
  background builds its material with `createSpriteMaterial`.
