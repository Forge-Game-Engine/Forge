# Design: Sprites Reference Textures, Not Draw Pipelines

|                                       |                                                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                            | Draft, for review                                                                                                                                                                                                                                                                                |
| **Kind**                              | Defect and feature                                                                                                                                                                                                                                                                               |
| **Found in**                          | Galactic Journey demo: `src/ui/create-qr-code.ts`, `src/main-menu/create-how-to-play-panel.ts`, `src/speed/create-hud.ts`, `src/engine-flame/*`, `src/shockwave/create-displacement-map.ts`, `src/ui/create-ui.ts`, `src/background/create-background.ts`, `src/explosions/create-explosions.ts` |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                                                                                                         |
| **Related**                           | [`shader-uniform-declarations.md`](./shader-uniform-declarations.md) (prerequisite), [`sprite-fill.md`](./sprite-fill.md), [`webgl-context-loss.md`](./webgl-context-loss.md)                                                                                                                    |

## 0. Targeted modules

| Path                                                                      | Change   | Notes                                                                                                                                                          |
| ------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/rendering/components/sprite-component.ts`                            | Modified | Phase 0: vector fields copied per component. Phase 2: `texture`, `emissive`, `material` and `category` replace `renderable`                                    |
| `src/rendering/texture.ts`                                                | **New**  | `Texture` and `createTexture`: from any `TexImageSource`, updatable, disposable; render targets' colors are `Texture`s too                                     |
| `src/rendering/materials/material.ts`                                     | Modified | Materials with the same shaders share one linked program and its uniform table; every declared uniform gets a value on bind; sampler uniforms take a `Texture` |
| `src/rendering/materials/create-sprite-material.ts`                       | **New**  | A material for a custom sprite fragment shader, paired with `sprite.vert`                                                                                      |
| `src/rendering/render-context.ts`                                         | Modified | The program cache, the default sprite material, white and black `Texture`s                                                                                     |
| `src/rendering/render-target.ts`                                          | Modified | `colorTexture` is a `Texture`                                                                                                                                  |
| `src/rendering/utilities/create-image-sprite.ts`                          | Modified | Takes a `Texture`, does no GL work                                                                                                                             |
| `src/rendering/systems/render-system.ts`, `sprite.ts`, `create-sprite.ts` | Modified | Batches by material, texture and emissive texture; owns the sprite quad and instance layout; `Sprite`/`createSprite` stop taking a `Renderable`                |
| `src/text/**`                                                             | Modified | Font atlases become `Texture`s; text keeps its own materials and instance layouts; the per-(atlas, category) renderable cache goes                             |
| `src/ui/systems/ui-raycast-system.ts`, `src/rendering/terrain/*`          | Modified | Read the sprite's `category`; terrain's mesh takes a `Texture`                                                                                                 |
| `src/rendering/shaders/utils/*`                                           | Removed  | `createTextureFromImage`, `createEmptyTexture`, `getSharedBlackTexture`/`getSharedWhiteTexture`, `bindTextureToUniform`, `createProgram`/`createShader`        |
| `documentation-site/docs/docs/rendering/*.md`, demos, e2e                 | Modified | About 53 docs-site demo files, 15 docs pages and 9 e2e scenes                                                                                                  |

---

## 1. Summary

A sprite today holds a `Renderable`: a geometry, a material, the instance
layout, and the render category cameras cull by. A `Material` is what
other engines call a material instance: a compiled and linked shader
program plus its uniform values, textures included, with no shared
program underneath. `createImageSprite(image, ...)` builds all of that for
each image it's given, so:

- **Every image is its own material, and every material compiles and
  links its shaders.** The image is the material's `u_texture` uniform, so
  `createImageSprite` creates a new `Material` per call, and `Material`'s
  constructor compiles and links a new program (a TODO in `material.ts`
  notes the missing cache), along with a new quad geometry and a new
  texture. None of them is ever freed. Sprites showing the same image can
  share one result, and the demo's do; what they can't share is a program
  across images. The demo's HUD alone has 47 images, and its UI dozens of
  icons.
- **An image that changes at runtime needs raw GL.** Changing an
  entity's image by swapping `sprite.renderable` for another prebuilt one
  (the how-to-play pages, the boosted engine flames, the HUD's speed
  meter) works, but every image it can swap to is a full pipeline built up
  front. The leaderboard's QR code can't be built up front, and a
  renderable per code would compile a program per code and free nothing.
  So the demo builds one renderable for the first code, and for each new
  code creates a texture with `createTextureFromImage`, sets it on that
  renderable's material, and deletes the previous texture with raw GL.
- **Textures have no owner.** `createTextureFromImage` accepts any
  `TexImageSource` (`ImageData` included), but returns a raw
  `WebGLTexture` with no way to update or dispose it, and
  `createImageSprite` only accepts an `HTMLImageElement`. So the
  shockwave's displacement map is uploaded with raw `gl.createTexture`/
  `texImage2D` calls, and the demo builds a 4x4 white SVG for solid
  sprites although `getSharedWhiteTexture` exists.
- **The render category lives on the `Renderable`** (`createImageSprite`'s
  `layer` option), so the same image shown to two cameras with different
  culling masks needs two programs. Text and terrain already have their
  own `category`.
- **Sprites built from one template share their vectors.** The template's
  renderable is a shared resource, and should be. Its `pivot`, `uvOffset`
  and `uvScale` aren't: they're per-entity state that systems write per
  entity. The sprite animation system writes each entity's current frame
  into `uvOffset` in place, and the UI layout system writes each element's
  `pivot` in place. `addSpriteComponent` copies the options shallowly, so
  every entity built from one `createImageSprite` result shares those
  objects, and two explosions from one template show whichever frame was
  written last. `addSpriteComponent`'s own comment says each entity needs
  its own `Vector2` for this reason, but only its defaults get one. The
  demo gives each explosion a fresh `uvOffset` by hand; Forge's particle
  spawner and `createPanel` clone the vectors by hand.
- **Custom shaders need the whole pipeline by hand.** The demo's
  background and three docs-site demos build a `Renderable` from
  `createQuadGeometry`, `combineInstanceDataSegments` and
  `spriteInstanceDataSegment` to draw a sprite with their own fragment
  shader.

The fix separates what a `Renderable` bundles: what to draw (a `Texture`,
plus an optional emissive map), how to draw it (a `Material`, whose
program is shared), which cameras draw it (the sprite's `category`), and
the quad and instance layout (the render system's business). This is how
Unity's and Godot's 2D renderers are organized.

---

## 2. Scope

### In scope

- Phase 0: `addSpriteComponent` copying vector fields, on its own.
- `Texture`: created from images, canvases, `ImageData` and
  `ImageBitmap`; updatable; disposable; sampling options. Render targets'
  color attachments are `Texture`s too, so every sampler takes one type.
- Shared programs for materials with the same shaders, with every
  declared uniform given a value on bind.
- `SpriteEcsComponent` referencing `texture`, an optional `emissive` map,
  an optional `material`, and `category`.
- `createSpriteMaterial` for custom sprite fragment shaders.
- Batching by material, texture and emissive texture.
- White and black textures on the render context.
- Removing the raw GL helpers the wrappers replace, and migrating text,
  UI builders, particles, terrain, post-processing, docs demos and e2e
  scenes.

### Out of scope

- **Texture atlases and sprite packing.** With batching by texture,
  packing images into one texture is how a game gets fewer draw calls. It's
  a build-time tool question, separate from this.
- **Asset reference counting.** Textures are owned and disposed by whoever
  created them (§4.2). Automatic lifetime (Bevy's handles, Godot's
  ref-counted resources) can come later if ownership turns out to be hard
  to follow.
- **Float and compressed textures from sources.** Textures made from
  sources are 8-bit RGBA, as today; render targets keep their 8-bit and
  half-float formats.
- **Restoring textures after a lost WebGL context.** See
  [`webgl-context-loss.md`](./webgl-context-loss.md), which builds on
  `Texture` keeping its source.

---

## 3. How established engines handle this

- **Unity**: a `SpriteRenderer` references a `Sprite` (a `Texture2D` plus a
  rect, pivot and pixels per unit) and a `Material`. All sprites share the
  default sprite material and its shader unless given another. Per-image
  companion maps (normal, mask, emission) are attached to the sprite as
  secondary textures, so sprites with different maps still share one
  material. Textures can be created from pixels (`new Texture2D` +
  `SetPixels32` + `Apply`) and freed with `Destroy`. Sprites with the same
  material and texture batch.
- **Godot**: `Sprite2D.texture` is a `Texture2D` resource; swapping it
  swaps the image. A `CanvasTexture` bundles a diffuse texture with its
  normal and specular maps and is assigned the same way. `ImageTexture.create_from_image`
  makes one from pixels. Custom shaders are a `ShaderMaterial` on the
  node; the default canvas material is shared. Batching is by texture and
  material.
- **Bevy**: `Sprite { image: Handle<Image>, .. }`; `Image::new` makes one
  from raw data. A `Sprite` can't take a custom material; custom 2D
  shaders use a `Material2d` on a `Mesh2d` with a mesh the game supplies.
  Batching is by image.

Forge follows Unity and Godot: a sprite names a texture (with its
companion maps) and optionally a material; a material is a shared shader
plus values; the quad and instance layout belong to the renderer.

---

## 4. Design

### 4.1 Phase 0: components own their vectors

`addSpriteComponent` copies `pivot`, `uvOffset`, `uvScale` and `slices`
into new objects, so each component owns its data however the options
were built. The hand-written clones in `spawn-particle.ts` and
`createPanel`, and the demo's fresh `uvOffset` per explosion, are deleted.
This is independent of everything below and lands first.

### 4.2 Textures

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
Uploads keep straight alpha (no `UNPACK_PREMULTIPLY_ALPHA_WEBGL`), as the
sprite shaders expect (see "Alpha Blending" in `AGENTS.md`).

Whoever creates a texture owns it and disposes it when nothing uses it any
more. `renderContext.whiteTexture` (for solid-color sprites) and
`renderContext.blackTexture` (the default emissive map) are owned by the
render context.

A render target's `colorTexture` becomes a `Texture` too, created empty
at the target's size and format (8-bit or half-float), so every sampler
uniform takes one type and post-processing passes bind render targets the
same way as images.

### 4.3 Materials share programs

A `Material` is a shared program plus uniform values. The render context
caches linked programs by vertex and fragment shader, so creating a
material is cheap and each shader pair compiles once (this resolves the
"shader cache for compiled shaders" TODO in `material.ts`; the existing
`ShaderCache` holds shader sources, has no GL context, and can be shared
between render contexts, so the program cache can't live there).
`new Material(vertex, fragment, gl)` becomes
`new Material(renderContext, vertex, fragment)`.

The uniform table (declared uniforms, as in
[`shader-uniform-declarations.md`](./shader-uniform-declarations.md), and
their locations) belongs to the cached program, not to each material.

Uniform values live on the GL program, and today `bind` uploads only the
uniforms a material has set, so with shared programs a material would
inherit whatever the previous material on the same program uploaded. So
`bind` gives every declared uniform a value: the material's own if it set
one, otherwise a default (zero for numbers, vectors and matrices,
`blackTexture` for samplers). This resolves the "uniform defaults" TODO
in `Material.bind`, which shared programs make load-bearing.

### 4.4 Sprite materials

A material's vertex shader decides its instance layout. Sprites use
`sprite.vert` and its layout; text keeps its own materials and layouts
(the MSDF fill and the 29-float effects layout sampling `u_atlas`), and
terrain keeps its mesh. So the render system knows the layout from the
material, not from a single layout per render context.

`createSpriteMaterial(renderContext, fragmentShaderName)` returns a
material pairing `sprite.vert` with the named fragment shader. For a
sprite material, the render system binds the sprite's texture to
`u_texture` and its emissive map to `u_emissiveTexture` for each batch, so
a custom sprite shader declares `u_texture` and doesn't set it. That only
works once a shader that declares `u_texture` without reading it (a
procedural background) no longer throws, so
[`shader-uniform-declarations.md`](./shader-uniform-declarations.md) is a
prerequisite.

`renderContext.spriteMaterial` is the default, shared by every sprite that
doesn't name one.

### 4.5 The sprite component

```ts
interface SpriteRequiredOptions {
  width: number;
  height: number;
  texture: Texture;
}

interface SpriteEmissive {
  texture: Texture;
  /**
   * Multiplies the map. Values above `1` push into HDR, which replaces
   * today's separate `intensity` now that colors can exceed `1`.
   */
  color: Color;
}

interface SpriteDefaultedOptions {
  /** `null`: no emissive map (the black texture). */
  emissive: SpriteEmissive | null;
  /** `null`: the render context's `spriteMaterial`. */
  material: Material | null;
  /** Matched against each camera's `cullingMask`. Default `1`, as for text. */
  category: number;
  // pivot, tintColor, uvOffset, uvScale, enabled, layer, ... as today
}
```

`renderable` is removed. Changing `sprite.texture` changes the image, and
changing `sprite.emissive` changes its glow, without touching the
material; `uvOffset`/`uvScale` still select a frame within the texture.

The emissive map is per sprite, not per material, for the reason Unity
and Godot attach companion maps to the sprite or texture: sprites with
different maps keep sharing one material and program. The demo uses
emissive maps on the player, enemies, flames, power-ups and the finish
line, and its boosted flames change both the map and its color (open
question 2 records this choice).

### 4.6 `createImageSprite`

`createImageSprite(texture, options)` computes a sprite's options from a
texture: `width` and `height` from `pixelsPerUnit` and `frameDimensions`,
and nine-slice native sizes. It does no GL work and needs no render
context. `pixelated` moves to the texture's `filter`, the render `layer`
option becomes the sprite's `category`, and `emissiveMap` becomes the
sprite's `emissive`. It also sets `uvScale` to one frame's share of the
texture when `frameDimensions` is given; today it always returns
`{ 1, 1 }`, and the demo sets it by hand. That's a behavior change, noted
in the changelog.

### 4.7 Rendering

The render system owns one quad geometry per render context. Commands are
sorted by layer and draw order (see
[`sprite-draw-order.md`](./sprite-draw-order.md)), and consecutive
commands with the same material, texture and emissive texture form one
instanced draw. Different images still need separate draws; what changes
is that sprites of the same image batch wherever they came from, and
there's one program per shader pair instead of one per image. Text
glyphs go through the same path with their own materials; a font atlas is
a `Texture`, and the text shaping system's renderable cache (and the
category in its shape snapshot) are deleted, since text reads
`TextEcsComponent.category` directly.

`Renderable` stays as the render system's internal batch description;
it's no longer part of any public API, and neither are the instance data
segment helpers it uses (`InstanceDataSegment`,
`combineInstanceDataSegments`, `spriteInstanceDataSegment`,
`setupInstanceAttribute`). Nothing outside Forge's own text code uses them
(open question 1).

The raw GL helpers the wrappers replace are deleted:
`createTextureFromImage`, `createEmptyTexture` (render targets create
their `Texture`s themselves), `getSharedBlackTexture`/`getSharedWhiteTexture`,
`bindTextureToUniform`, and `createProgram`/`createShader` (which
duplicate `Material`'s own compile step), along with the e2e scenes'
white-square image helper.

---

## 5. Phases

### Phase 0: Components own their vectors

| #   | Task                                                                                                                             | Size |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 0.1 | `addSpriteComponent` copies `pivot`, `uvOffset`, `uvScale`, `slices`; delete the clones in `spawn-particle.ts` and `createPanel` | S    |
| 0.2 | Test: two components from one options object don't share vectors; changelog under `#### Fixed`                                   | S    |

### Phase 1: Textures and shared programs

| #   | Task                                                                                                                                                                                            | Size |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `Texture`, `createTexture`, `update`, `dispose`; white and black textures on the render context                                                                                                 | M    |
| 1.2 | `RenderTarget.colorTexture` as a `Texture`; post-processing and present bind it                                                                                                                 | S    |
| 1.3 | Program cache on the render context; the uniform table on the cached program; `Material` takes the render context; every declared uniform gets a value on bind; sampler uniforms take `Texture` | M    |
| 1.4 | Tests: shared programs, no uniform leaking between materials, texture update and dispose, use after dispose throws                                                                              | S    |
| 1.5 | Migrate the 14 files that construct `Material` and every sampler `setUniform`; changelog under `#### Changed`                                                                                   | M    |

**Definition of done:** creating two materials from the same shaders links
one program; a material never sees another's uniform values; a texture can
be created from `ImageData` and updated. This phase already changes
public signatures (`Material`, sampler values).

### Phase 2: Sprites reference textures

| #   | Task                                                                                                                                                                          | Size |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 2.1 | `SpriteEcsComponent` `texture`/`emissive`/`material`/`category`; `renderable` removed                                                                                         | M    |
| 2.2 | `createImageSprite(texture, options)` (with `uvScale` from `frameDimensions`); `createSpriteMaterial`; the default sprite material                                            | M    |
| 2.3 | Render system: internal quad, layouts from materials, batching by material, texture and emissive texture, culling by `category`; `Sprite`/`createSprite` without `Renderable` | L    |
| 2.4 | Text: font atlas `Texture`; renderable cache and snapshot category removed; `TextMeshEcsComponent` stops exposing renderables                                                 | M    |
| 2.5 | `ui-raycast-system` and terrain migrate; raw GL helpers and instance-segment exports removed                                                                                  | M    |
| 2.6 | Migrate `/src` (UI builders, particles, nine-slice), about 53 docs-site demo files and 9 e2e scenes                                                                           | L    |
| 2.7 | Guides (about 15 pages: `rendering/*`, `material-uniforms.md`, `bloom.md`, particle emitters); changelog under `#### Changed`                                                 | M    |

**Definition of done:** no public API takes or returns a `Renderable`;
sprites of the same texture and material in sequence draw in one call
wherever they were created; the docs demos and e2e suite pass; a sprite's
image or glow can be changed by assigning `texture` or `emissive`.

Depends on [`shader-uniform-declarations.md`](./shader-uniform-declarations.md).

---

## 6. Decision log

### DL-1: Sampling options live on the texture

**Options.** (a) On the texture (Unity's import settings). (b) Per sprite,
with WebGL2 sampler objects (Godot 4's `texture_filter` on the node).

**Decision: (a).**

**Rationale.** It's today's behavior (`pixelated` is fixed when the
texture is created), keeps the batch key small, and a game wanting both
filters for one image can create two textures. (b) is worth revisiting if
that turns out to be common.

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
`Renderable` only because the renderable was per image. Text and terrain
already have their own `category`; sprites now match them, with the same
default of `1`.

### DL-4: Components copy their vector fields

**Options.** (a) Copy in the factory. (b) Document that callers must
clone.

**Decision: (a).**

**Rationale.** The factory that attaches a component is the one place
that knows which of its fields are mutable objects. (b) is the status quo,
and the clones scattered through `/src` and the demo show it isn't
followed reliably.

### DL-5: Shared programs give every uniform a value

**Options.** (a) Defaults on bind for every declared uniform. (b) Require
each material to set every uniform. (c) One program per material, as
today.

**Decision: (a).**

**Rationale.** (b) makes every custom material repeat values it doesn't
care about. (c) keeps the per-image compile cost this design removes.
Godot and Unity both give unset parameters their declared defaults.

---

## 7. Open questions

1. **Can the instance-segment helpers stop being public?**
   `InstanceDataSegment`, `combineInstanceDataSegments`,
   `spriteInstanceDataSegment` and `setupInstanceAttribute` are the only
   public way to add custom per-instance data. Nothing outside Forge's own
   text code uses them, and custom sprite shaders no longer need them.
   - (a) Make them internal (proposed). (b) Keep them public as an
     extension point.
2. **Emissive maps on the sprite or on the material?** Per sprite
   (proposed above) matches Unity's secondary textures and Godot's
   `CanvasTexture` and keeps sprites on one material, at the cost of the
   emissive texture joining the batch key and its color joining the
   instance data. Per material would keep the sprite component smaller,
   but every emissive image would need its own material, and the demo
   uses five.
   - (a) On the sprite (proposed). (b) On the material.
3. **Should `createImageSprite` be renamed** now that it takes a
   `Texture`? It builds sprite options from a texture's size.
   - (a) Keep the name (proposed). (b) `createSpriteOptions`.

---

## 8. Testing considerations

- `Texture`: creation from each source type the unit tests can mock;
  `update` re-uploads; `dispose` deletes and later use throws.
- Program cache: two materials, one link; different shaders, two; a
  material that doesn't set a uniform gets the default, not the previous
  material's value.
- Render system: batch boundaries at material, texture or emissive
  changes; category culling; a sprite whose `texture` changes draws the
  new one.
- `addSpriteComponent`: two components from one options object don't
  share vectors.
- e2e: the existing rendering scenes migrate; one renders two sprites
  from one texture created by separate `createImageSprite` calls and
  asserts both appear, using the relative measurement pattern from
  `AGENTS.md`.

## 9. Documentation and demo follow-up

- Guides: textures (creating, updating, disposing), sprite materials,
  emissive maps, categories; every sample moves from `renderable` to
  `texture`.
- Demo: the QR code updates one `Texture`; the how-to-play pages and HUD
  assign `sprite.texture`; the boosted flames assign `texture` and
  `emissive`; the displacement map and the white SVG become
  `createTexture` and `renderContext.whiteTexture`; the background builds
  its material with `createSpriteMaterial`.
