# Design 07: 2D on the Render Pipeline

|                                       |                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                     |
| **Kind**                              | Refactor, defect fixes and feature                                                                    |
| **Engine version at time of writing** | `0.26.1`                                                                                              |
| **Program**                           | [Forge 3D](./README.md), milestone M2                                                                 |
| **Depends on**                        | [06 Render pipeline](./06-render-pipeline.md) (Phase 1 here ships with its Phase 2)                   |
| **Related**                           | [08 Meshes, materials and shaders](./08-meshes-materials-and-shaders.md) (Phase 4 here needs its meshes), [13 Post-processing](./13-post-processing-and-anti-aliasing.md) |

## 0. Targeted modules

| Path                                                         | Change   | Notes                                                                                              |
| ------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------- |
| `src/rendering/sprites/` (new; from `render-system.ts` and `utilities/*instance-data-segment.ts`) | New | Sprite extraction system, instance layouts, nine-slice expansion            |
| `src/rendering/components/sprite-component.ts`               | Modified | `billboard`                                                                                        |
| `src/rendering/draw-order.ts`                                | Modified | Resolver state on the render context's frame scratch; depth added to the transparent sort          |
| `src/rendering/shaders/sprite/*`, `shaders/mask/*`           | Modified | One instance matrix instead of position, rotation, scale, size and pivot; masks in the mask's plane |
| `src/rendering/materials/sprite-material.ts`                 | Modified | On the design 08 material system (UBO-backed)                                                      |
| `src/rendering/terrain/*`                                    | Modified | A draw item in the transparent phase                                                               |
| `src/text/rendering/*`                                       | Modified | Glyphs drawn with the entity's full transform                                                      |
| `src/ui/**`                                                  | Modified | Canvases as orthographic cameras with `order`; world-space canvases in 3D views                    |
| `src/rendering/texture.ts`, `texture-cache.ts`               | Modified | Images load as sRGB textures                                                                       |
| `src/math/matrices/matrix3x3.ts`                             | Removed  | Its last users go                                                                                  |
| `e2e/**`, golden images                                      | Modified | Updated for linear blending (Phase 2), reviewed                                                    |
| `documentation-site/docs/docs/rendering/`                    | Modified | `sprites.md`, `draw-order.md`, `masks.md`, `hdr-rendering.md`; new `2d-and-3d-together.md`         |

---

## 1. Summary

Every 2D feature Forge has draws through one render system: sprites,
nine-slice sprites, glyphs of text, UI panels and labels, masked fills,
particles (each a sprite entity), and the terrain. Its draw order (layer,
world order, optional y-sort, hierarchy order) is exact and well defined.
Design 06 replaces that render system with a pipeline of passes; this
design moves every 2D feature onto it without changing what 2D games see,
then makes three deliberate changes:

1. **Linear blending.** Images load as sRGB textures and blending happens
   in linear space, so translucent 2D and lit 3D composite correctly
   together (README G3). Translucent edges and gradients look slightly
   different; the golden images are updated in one reviewed change.
2. **Matrices.** Each sprite instance, nine-slice region and glyph carries
   one camera-relative world matrix instead of a 2D position, angle and
   scale, so sprites and text can be placed, rotated and seen in 3D, and
   text finally rotates and scales as a whole (today each glyph rotates
   about its own center, a defect).
3. **Depth.** Sprites and text draw in the transparent phase with depth
   testing, so opaque 3D geometry hides what's behind it, and they sort
   with 3D transparent objects by distance from the camera. When everything
   is at `z = 0`, as in every 2D game today, distance ties and today's order
   decides, unchanged.

The 2D API stays as it is: the same sprite, text, mask, draw-order,
visibility and UI components, the same orthographic camera fields. A 2D
game written against `0.26` changes only for the transform migration
(design 04) and the camera controller (design 06).

---

## 2. Scope

### In scope

- Sprites, nine-slice sprites, text, masks, terrain and UI as extraction
  systems and draw items in the pipeline's transparent phase.
- The transparent sort order, extended with depth.
- The instance format: one matrix per quad; masked and unmasked variants.
- Billboarded sprites for 3D views.
- Linear blending, sRGB textures and the output pass's encoding.
- Text drawn with its entity's full transform.
- Masks defined in their own entity's plane.
- 2D and 3D together: what happens and how a game controls it.

### Out of scope

- **2D lighting** (lights and normal maps for sprites). A feature of its
  own; design 08's shader hooks make a custom lit sprite material possible
  meanwhile.
- **Pixel-perfect snapping** for pixel-art cameras. It deserves its own
  small design (a camera setting that snaps the view to whole texels).
- **GPU particles.** Particles stay sprite entities here; design 15 adds 3D
  emitters.
- **Changes to UI layout.** UI canvases keep working as orthographic
  cameras; layout code only reads the transform (design 04).

---

## 3. Phases

### Phase 1: 2D on the pipeline (ships with design 06 Phase 2)

Identical output to `0.26`: same color handling, same order, same pixels.

| #   | Task                        | Description                                                                                                         | Size |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | Sprite extraction           | Sprites and nine-slice regions become transparent-phase draw items; today's instance data, on the device's ring allocator | L |
| 1.2 | Text and terrain extraction | Glyph quads and terrain meshes as transparent-phase items                                                           | M    |
| 1.3 | Draw order                  | The resolver and its sort buffers move from module scope onto the render context's frame scratch                     | S    |
| 1.4 | UI canvases                 | Orthographic cameras with `order` and targets, composited by the output pass                                       | S    |
| 1.5 | Delete                      | `render-system.ts`, `present-system.ts`, the module-scope buffers                                                   | S    |

**Definition of done:** every e2e spec and golden passes with no image
changes; B7 and B8 are no slower than the baseline.

### Phase 2: Linear blending

| #   | Task                    | Description                                                                                                  | Size |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------ | ---- |
| 2.1 | sRGB textures           | Images and colors load as `rgba8unorm-srgb`; `TextureOptions.colorSpace` for data textures                    | S    |
| 2.2 | Linear targets          | 2D views render into `rgba8unorm-srgb` (or `rgba16float` with HDR features); MSAA in the same format         | S    |
| 2.3 | Output encoding         | §6.5: the output pass encodes to sRGB and keeps the premultiplied contract                                   | S    |
| 2.4 | Goldens and e2e         | Regenerate the affected goldens; update relative e2e expectations where they encode gamma-space blending     | M    |
| 2.5 | Changelog               | `#### Changed`: 2D blending now happens in linear space; what looks different and why                        | S    |

**Definition of done:** an analytic test shows 50% white over black reads
back as linear 0.5 (sRGB ≈ 0.735); the golden changes are reviewed.

### Phase 3: Matrices, depth and billboards

| #   | Task                    | Description                                                                                           | Size |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------- | ---- |
| 3.1 | Instance matrix         | §6.2: one camera-relative 3x4 matrix per quad, with size, pivot and flip folded in                     | M    |
| 3.2 | Text transform          | Glyphs placed through the entity's matrix (defect fix)                                                 | S    |
| 3.3 | Masks in their plane    | §6.4                                                                                                  | M    |
| 3.4 | Masked variant          | Unmasked sprites use a layout without mask attributes                                                  | S    |
| 3.5 | Depth sort and test     | §6.3                                                                                                  | S    |
| 3.6 | Billboards              | §6.2.2                                                                                                 | S    |
| 3.7 | Delete `Matrix3x3`      | Its last users are gone                                                                                | S    |
| 3.8 | Changelog               | `#### Fixed`: text rotates and scales as a whole; `#### Added`: billboards, sprites in 3D views       | S    |

**Definition of done:** a perspective camera shows sprites and text placed
in 3D with correct occlusion and sorting; B7 is no slower than the
baseline.

### Phase 4: 2D and 3D together (after design 08 Phase 1)

| #   | Task                 | Description                                                                                    | Size |
| --- | -------------------- | ---------------------------------------------------------------------------------------------- | ---- |
| 4.1 | Guide                | `2d-and-3d-together.md` (§6.6)                                                                 | M    |
| 4.2 | Demos                | Billboard trees in a 3D scene; 3D meshes in a 2D side-scroller; a UI canvas on a 3D monitor     | M    |

**Definition of done:** the three demos run on the docs site.

---

## 4. Decision log

| #   | Decision                                     | Options                                                                                                                       | Chosen | Rationale, trade-offs, assumptions                                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Where 2D draws                               | (a) In the transparent phase with 3D transparent objects, depth-tested, not depth-written; (b) a separate 2D pass after 3D    | (a)    | (b) would draw a sprite behind a wall on top of it in a 3D view. In (a), opaque 3D occludes sprites, and sprites and translucent 3D objects interleave by distance. In a pure 2D view nothing writes depth, so the test never rejects anything.                                                             |
| S2  | Transparent sort order                       | (a) One order for 2D and 3D: layer, world order, distance (far first), root Y (y-sorting cameras), hierarchy order; (b) separate orders | (a) | The existing 2D order, with distance inserted where it ties for every 2D game today (everything at `z = 0`). A 2D game that sets `z` gets intuitive results: nearer draws in front within a layer.                                                                                                     |
| S3  | Per-instance transform                       | (a) A camera-relative 3x4 matrix with size, pivot and flip folded in; (b) position, angle and scale as today                  | (a)    | A 2D angle can't express a 3D orientation. Folding size and pivot into the matrix frees attribute slots (text uses 15 of the 16 WebGL2 guarantees today), and the shader does one matrix multiply instead of pivot, scale, rotate and translate steps. Computing camera-relative on the CPU in 64-bit keeps 2D precise far from the origin. |
| S4  | Where sprite data lives                      | (a) A per-frame instance stream, as today; (b) GPU scene slots like meshes (design 06)                                       | (a)    | Sprites change often (animation frames, tints, fills), and their per-instance data is mostly not transform. Streaming what's visible is cheaper than keeping a persistent copy in sync. Meshes, whose data is mostly static, use the GPU scene.                                                       |
| S5  | Linear blending in 2D                        | (a) Yes (README G3); (b) keep gamma-space blending for 2D                                                                    | (a)    | Mixed 2D and 3D needs one color space. The cost is a final output pass for 2D games, which today draw straight to the canvas: WebGL2's canvas has no sRGB mode, so blending in linear requires drawing into an sRGB target first. When a view has any post-processing, the output pass is fused with it and costs nothing extra. |
| S6  | Text transform                               | (a) Glyphs through the entity's matrix; (b) keep per-glyph rotation about each glyph's center                                | (a)    | (b) is a defect: rotated text comes apart into individually rotated letters along a horizontal line. Every engine rotates text as a block.                                                                                                                                                         |
| S7  | Mask space                                   | (a) A mask's shape is in its own entity's XY plane; (b) world XY as today                                                    | (a)    | World XY only works when everything is flat and unrotated in 3D. The mask's own plane is what UI expects and works for a world-space canvas on a 3D surface.                                                                                                                                      |
| S8  | Billboards                                   | (a) A `billboard` field on the sprite (`'none'`, `'face-camera'`, `'upright'`); (b) a separate component                     | (a)    | It changes how the sprite's matrix is built per view, which the sprite extraction owns; a separate component would need a second writer of the same matrix.                                                                                                                                        |

---

## 5. Open questions

1. **Distance in 2D sorting.** With S2, a 2D game that sets `z` changes its
   order. Options: (a) use distance (nearer in front), as proposed; (b) ignore
   `z` in orthographic views. (a) is consistent with 3D and with how other
   engines treat 2D depth; (b) keeps `z` purely for parallax. Proposal: (a).

---

## 6. Design

### 6.1 Extraction

The sprite extraction system declares `[spriteId, transformId]` (and a text
query through `queries`) and runs in the `render` stage (design 03). Per
camera view it:

1. skips entities hidden in the hierarchy or outside the camera's
   `cullingMask` (as today);
2. expands nine-slice sprites into regions (as today);
3. culls each quad against the view (a sphere test in 3D views; the
   existing rectangle test in orthographic views);
4. writes sort keys (§6.3) and instance data for visible quads into the
   view's transparent phase.

Its scratch (draw items, sort keys, instance staging) lives on the render
context's frame scratch, sized to the scene and reused, replacing the
module-scope arrays in `render-system.ts` (design 03 §6.5).

### 6.2 Instances

#### 6.2.1 Layout

| Attribute                   | Contents                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `a_instanceMatrix0..2`      | Rows of a camera-relative 3x4 matrix mapping the unit quad to the sprite's corners           |
| `a_instanceTexRect`         | UV offset and scale                                                                          |
| `a_instanceTint`            | Tint, straight alpha                                                                         |
| `a_instanceEmissive`        | Emissive color                                                                               |
| `a_instanceMask*`           | Masked variant only (§6.4)                                                                   |

The CPU builds the matrix per view:
`cameraRelative(world.matrix) × translate(-pivot × size) × scale(size × flip)`.
The vertex shader is `view-projection × matrix × corner`. Nine-slice
regions and glyphs get their own matrices the same way. Sprites without a
mask use a pipeline variant without mask attributes, which saves 14 floats
per instance for the common case.

#### 6.2.2 Billboards

`SpriteEcsComponent.billboard`:

- `'none'` (default): the sprite lies in its entity's XY plane, as in 2D.
- `'face-camera'`: the sprite's plane faces the view, keeping the entity's
  position and scale and its rotation about the view axis.
- `'upright'`: the sprite turns about world Y only to face the camera
  (trees, characters in a 3D world).

The extraction builds the rotation per view, so one sprite seen by two
cameras faces each.

### 6.3 Order and depth

The transparent phase sorts by these keys, most significant first, with
the existing exact radix sort:

1. `layer` (sprite and text, as today; 3D transparent materials have a
   `layer` too, default 0);
2. world order (`DrawOrderEcsComponent`, as today);
3. distance from the camera plane, far first (new);
4. root Y, for `ySort` cameras (as today);
5. root creation sequence and hierarchy index (as today), so an entity's
   sprite draws before its text and `behindParent` works.

Transparent items test depth against what opaque passes wrote and don't
write it. In a 2D view with no opaque geometry, depth never rejects
anything, and keys 1, 2, 4 and 5 reproduce today's order exactly.

### 6.4 Masks

A mask's shape (rectangle, edge fill, sector) is defined in the mask
entity's local XY plane, the way it's authored today. The instance carries
the mask's origin and its two axes in camera-relative world space; the
fragment shader projects the fragment's camera-relative position onto them
and evaluates the existing shape tests. For flat 2D content the results
are identical to today's world-space rectangles.

### 6.5 Color

- Color images (sprites, UI art) load as `rgba8unorm-srgb`, so sampling
  returns linear values. `TextureOptions` gains `colorSpace: 'srgb' |
  'linear'`; MSDF font atlases, masks and other data textures load as
  `linear`, since their values are distances and coverage, not colors.
- `Color` values are sRGB as authored and converted to linear when
  uploaded (tints, clear colors, emissive), so `Color.white` stays white
  and a hex color still means the color a designer picked. Components above
  `1` (HDR colors) keep their meaning as an intensity multiplier: the curve
  is applied to the part up to `1` and the rest scales linearly
  (`linear = toLinear(min(c, 1)) × max(c, 1)`), so a tint of `2` is still
  twice as bright. The conversion lives in one function used by every
  upload.
- A 2D view renders into `rgba8unorm-srgb` (or `rgba16float` when an HDR
  feature such as bloom is in the pipeline). Blending into an sRGB target
  happens in linear space in hardware.
- The output pass (design 06 §6.4.3) reads the view's color and writes the
  canvas with sRGB encoding in the shader, since the canvas can't be an
  sRGB target. Premultiplied alpha is kept: it unpremultiplies, encodes and
  premultiplies again, so transparent canvas pixels still composite
  correctly over the page.

### 6.6 2D and 3D together

The guide covers three patterns:

- **Sprites and text in a 3D world:** place them with 3D transforms; use
  `billboard` for things that should face the camera; opaque geometry
  occludes them and they sort with 3D transparent objects.
- **3D models in a 2D game:** an orthographic camera draws meshes like
  anything else. Meshes write depth, so place sprites in front of or
  behind a model with `z`, or draw the 3D content with its own camera and
  composite it by `order` when it should simply sit on a layer.
- **UI over 3D, and UI on 3D surfaces:** screen-space canvases are cameras
  with a higher `order` (as today). A world-space canvas is entities under
  a 3D transform and draws in the 3D view's transparent phase; design 15
  covers pointer hits on it.

### 6.7 Performance

- B7 (50,000 sprites) and B8 (UI) must not regress: the instance stream
  shrinks from 34 floats to 23 for unmasked sprites (12 matrix, 4 UV, 4
  tint, 3 emissive) and is 37 for masked ones, and the vertex shader does
  less work.
- The 2D output pass costs one full-screen read and write per frame for
  views without post-processing (S5). Measured in B7 on the mobile
  reference.
- No allocation per frame (allocation specs for the sprite, text and
  terrain extraction).

### 6.8 Testing

- Phase 1: the existing e2e and golden suites are the test; they must not
  change.
- Phase 2: the linear-blending analytic test; regenerated goldens reviewed
  side by side.
- Phase 3: golden scenes for rotated text, sprites in a perspective view
  occluded by a box, billboard modes, masks on a rotated canvas; unit tests
  for instance matrices (pivot, flip, nine-slice), the sort keys with
  distance, mask projection.
- Allocation specs and B7, B8 benchmarks at every phase.
