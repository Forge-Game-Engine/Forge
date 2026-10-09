# Design 08: Meshes, Materials and Shaders

|                                       |                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                     |
| **Kind**                              | Feature and refactor                                                                                  |
| **Engine version at time of writing** | `0.26.1`                                                                                              |
| **Program**                           | [Forge 3D](./README.md), milestone M3                                                                 |
| **Depends on**                        | [05 GPU device layer](./05-gpu-device.md), [06 Render pipeline](./06-render-pipeline.md)             |
| **Related**                           | [09 Lighting](./09-lighting-and-shadows.md) and [10 PBR](./10-pbr-and-environment-lighting.md) (shading models), [11 glTF](./11-gltf-and-asset-lifetime.md) (mesh and material data), [12 Animation](./12-skeletal-and-morph-animation.md) (skinning and morph variants) |

## 0. Targeted modules

| Path                                                      | Change   | Notes                                                                                                 |
| --------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `src/rendering/meshes/` (new)                             | New      | `Mesh`, mesh parts, vertex layouts, bounds, the mesh pool, tangent generation, primitives            |
| `src/rendering/components/mesh-component.ts` (new)        | New      | `MeshEcsComponent`, `addMeshComponent`                                                                |
| `src/rendering/meshes/mesh-extraction-system.ts` (new)    | New      | Mesh objects into the GPU scene and the opaque, alpha-tested, transparent and shadow phases          |
| `src/rendering/materials/`                                | Modified | Material blocks in uniform buffers, render state, variants, pass variants, hooks, `UnlitMaterial`, custom materials |
| `src/rendering/shaders/pre-processing/`                   | Modified | Uniform block generation, defines, hooks, source line mapping                                         |
| `src/rendering/shaders/forge/` (new)                      | New      | The engine shader library: view, object, vertex, surface and output includes                          |
| `src/rendering/geometry/`                                 | Removed  | `Geometry` replaced by `Mesh`; the shared quad becomes a mesh                                         |
| `src/rendering/render-context.ts`                         | Modified | `prepare()`; the unused global uniform map removed                                                    |
| `documentation-site/docs/docs/rendering/`                 | Modified | `material-uniforms.md` rewritten; new `meshes.md`, `materials.md`, `custom-shaders.md`, `shader-hooks.md` |

---

## 1. Summary

Forge can draw quads. A 3D engine needs meshes: indexed vertex data with
several attributes, split into parts that each use a material, with bounds
for culling. It needs materials that carry their render state (opaque,
alpha-tested, blended, double-sided), that compile only the shader
variants actually used, and that work in every pass a mesh is drawn in
(depth prepass, shadow maps, color). And the product owner asked for a
render pipeline a game can hook into with custom shaders.

This design adds:

- **`Mesh`**: interleaved, optionally quantized vertex data and indices,
  parts, bounds, and kept CPU data (for context loss, physics and
  picking). Small static meshes are packed into shared buffers so they can
  be drawn together. Primitives (box, sphere, plane, cylinder, capsule,
  cone) are built in.
- **`MeshEcsComponent`**: a mesh, a material per part, shadow flags,
  `category` and `layer` like sprites, an optional per-object tint and
  levels of detail. One extraction system turns them into draw items.
- **Materials on uniform buffers.** A material's uniforms live in one
  block in a uniform buffer, uploaded when they change. Custom shaders keep
  declaring loose uniforms as they do today; the preprocessor gathers them
  into the block.
- **Shader variants and passes.** Features (normal maps, skinning, alpha
  testing) are compile-time defines; each material compiles only the
  variants its meshes and passes use. Depth and shadow variants come from
  the same source, so a vertex animation casts the right shadow.
- **Shader hooks.** A material can supply GLSL functions the engine's
  shaders call at fixed points: vertex, surface, lighting and final color.
  A hooked material keeps everything the engine does for it (instancing,
  camera-relative positions, skinning, morphing, lights, shadows, fog of
  its own). Fully custom shaders remain possible, and declare the passes
  they support.
- **No compile hitches.** Pipelines compile in parallel; `prepare()`
  compiles everything a scene needs behind a loading screen; a variant
  that isn't ready yet skips drawing instead of stalling the frame.
- **`UnlitMaterial`**, the first material, with color, texture, vertex
  colors and every alpha mode. The PBR material is design 10.

---

## 2. Scope

### In scope

- Meshes, vertex formats (including quantized ones), indices, parts,
  bounds, the mesh pool, tangent generation, primitives.
- The mesh component and its extraction.
- The material system: blocks, textures, render state, phases, variants,
  pass variants, per-object tint.
- Shader hooks, custom materials and the engine shader library.
- Compilation management and `prepare()`.
- `UnlitMaterial`.
- Moving `SpriteMaterial` and today's custom-material users onto the new
  system.

### Out of scope

- **Lit shading models**: design 09 (lights) and 10 (PBR).
- **Skinning and morph data**: design 12 adds the attributes and the
  object data; this design reserves the variant bits and hook order.
- **A shader graph or node editor.** Forge is code-only.
- **Decals, terrain meshes, procedural mesh editing APIs.** Games can build
  meshes from arrays; editing tools come later if needed.
- **Mesh compression decoding**: design 11 (Draco and meshopt are glTF
  extensions).

---

## 3. Phases

### Phase 1: Meshes and unlit materials

| #   | Task                       | Description                                                                                                           | Size |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `Mesh`                     | §6.1: creation from arrays, layouts, indices, parts, bounds, kept CPU data                                            | M    |
| 1.2 | Primitives                 | Box, sphere, plane, cylinder, capsule, cone, quad, with normals, UVs and tangents                                    | M    |
| 1.3 | Material blocks            | §6.3: loose uniforms gathered into a std140 block; CPU-side block buffer; upload on change; `setUniform` validation as today | L |
| 1.4 | `MeshEcsComponent` and extraction | §6.2: slots, phases, sort keys, culling through design 06                                                      | M    |
| 1.5 | `UnlitMaterial`            | §6.6                                                                                                                  | S    |
| 1.6 | Sprite materials           | `SpriteMaterial` and the existing custom-material demos and e2e specs on blocks                                      | M    |
| 1.7 | Demo and guide             | A spinning, textured cube; `meshes.md`, `materials.md`                                                                | S    |

**Definition of done:** the demo runs; 10,000 cubes sharing a mesh and
material draw in one instanced call; `material-uniform-array` and
`material-unused-uniform` e2e specs pass unchanged.

### Phase 2: Render state, variants and passes

| #   | Task                       | Description                                                                                                  | Size |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------ | ---- |
| 2.1 | Render state               | §6.4: blend modes, alpha cutoff, double-sided, depth settings, depth bias; phase selection                   | M    |
| 2.2 | Variants                   | §6.5: variant keys from material, mesh and pass features; program cache keyed by sources and defines         | M    |
| 2.3 | Pass variants              | Depth-only and shadow variants generated from the same sources                                              | M    |
| 2.4 | Per-object tint            | A fifth GPU scene texel; `MeshEcsComponent.tint`                                                              | S    |
| 2.5 | Mesh pool and multi-draw   | Small static meshes packed per layout; indices rebased; design 06 multi-draw merges them                    | M    |

**Definition of done:** alpha-tested and double-sided meshes render
correctly in color, depth and shadow passes (golden scenes); B1 with 200
unique meshes issues no more than one draw per pipeline and material.

### Phase 3: Shader hooks and custom materials

| #   | Task                       | Description                                                                                       | Size |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------- | ---- |
| 3.1 | Engine shader library      | §6.7: `forge/view`, `forge/object`, `forge/vertex`, `forge/surface`, `forge/output`               | M    |
| 3.2 | Hooks                      | §6.8: vertex, surface, lighting and final-color hooks; their uniforms and textures                | L    |
| 3.3 | Custom materials           | §6.9: full vertex and fragment shaders with declared passes                                       | M    |
| 3.4 | Error mapping              | Compile and link errors report the original file and line through includes and hooks             | S    |
| 3.5 | Guides and demos           | `custom-shaders.md`, `shader-hooks.md`; demos: wind on grass (vertex hook), a dissolve (surface hook with alpha test casting matching shadows), toon shading (lighting hook) | M |

**Definition of done:** the three demos run, and each casts and receives
shadows correctly once design 09 lands (their golden scenes are added
then).

### Phase 4: Compilation without hitches

| #   | Task                    | Description                                                                                             | Size |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------- | ---- |
| 4.1 | Asynchronous variants   | Pipelines compile through design 05's asynchronous path; draws whose variant isn't ready are skipped    | M    |
| 4.2 | `prepare()`             | §6.10: compiles every variant the world's current meshes, materials, lights and cameras need           | M    |
| 4.3 | Tangent generation      | The MikkTSpace algorithm, for normal-mapped meshes without tangents (glTF requires it)                  | M    |
| 4.4 | Counters                | Variants compiling, compiled, and draws skipped, in the stats overlay                                   | S    |

**Definition of done:** in B5 with `prepare()` awaited, no frame after the
first exceeds the budget because of compilation (measured by the design 01
runner).

---

## 4. Decision log

| #    | Decision                                  | Options                                                                                                                                                         | Chosen | Rationale, trade-offs, assumptions                                                                                                                                                                                                                                                                                                                      |
| ---- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MS1  | Material uniform storage                  | (a) A uniform block generated from the shaders' loose uniform declarations; (b) require shaders to declare their own block; (c) loose uniforms uploaded per draw, as today | (a) | A block bound with one call replaces per-draw uploads (design 05 D3), and WebGPU has no loose uniforms. Generating it keeps today's shaders valid: a block without an instance name puts its members in global scope, so the preprocessor only moves the declarations. Samplers stay loose; GLSL ES 3.00 can't put them in blocks.                    |
| MS2  | Extending engine shaders                  | (a) Hooks: functions with fixed signatures the engine's shaders call; (b) patching engine shader text, as Three.js's `onBeforeCompile` does; (c) a node graph | (a)    | Patching text breaks with every engine change and doesn't reach the shadow and depth variants, which is why a patched Three.js material casts the unpatched shape's shadow. Hooks are stable API, and the engine compiles them into every pass. A node graph is an editor feature, and Forge is code-only.                                       |
| MS3  | Feature variation                         | (a) Compile-time defines, compiled on demand per used combination; (b) one shader with runtime branches for everything                                          | (a), with runtime branches for cheap per-material toggles | Texture fetches, skinning and normal mapping cost real time when compiled in but unused, and some can't be branched around on mobile. On-demand compilation means only combinations a scene uses ever compile. Cheap toggles (a factor that's 0 or 1) stay uniforms so they don't multiply variants.                                    |
| MS4  | Depth and shadow variants                 | (a) Generated from the material's own sources with a pass define; (b) one generic depth shader for every material                                              | (a)    | Vertex hooks, skinning, morphing and alpha testing all change what a depth or shadow pass must write. A generic shader would cast the wrong shadow for all of them.                                                                                                                                                                               |
| MS5  | Fully custom shaders and passes           | (a) A custom material lists the passes it supports, with sources for each; others skip it; (b) the engine guesses a depth shader                                 | (a)    | The engine can't derive a shadow shader from an arbitrary vertex shader. Explicit is predictable: a custom material that lists no shadow pass casts no shadow, and the guide says so.                                                                                                                                                            |
| MS6  | Per-object variation without breaking batches | (a) A tint in the GPU scene's object data, multiplied by the standard shading; (b) a material per variation                                                 | (a)    | A crowd of differently colored objects stays one instanced draw. Anything beyond a tint is a different material, as in every engine.                                                                                                                                                                                                              |
| MS7  | Small static meshes                       | (a) Packed into shared vertex and index buffers per layout, indices rebased; (b) a buffer pair per mesh                                                        | (a), for meshes under 64 K vertices | Shared buffers let different meshes with the same material draw in one multi-draw (design 06), and save buffer binds. Large meshes keep their own buffers.                                                                                                                                                                                 |
| MS8  | Missing tangents                          | (a) Generate them with the MikkTSpace algorithm; (b) require tangents                                                                                            | (a)    | The glTF specification says to generate MikkTSpace tangents when a normal-mapped mesh has none, and tools bake normal maps against them.                                                                                                                                                                                                            |
| MS9  | CPU copies of mesh data                   | (a) Kept; (b) dropped after upload                                                                                                                               | (a)    | Context loss (design 05), mesh colliders (design 14) and triangle picking (design 15) need it. The memory cost is listed in the stats overlay. A game short of memory can create a mesh from data it then drops, accepting that context loss loses that mesh; this isn't an option on `Mesh`, just the consequence of disposing the source. |
| MS10 | Compile hitches                           | (a) Parallel compilation, `prepare()` and skipping not-ready draws; (b) compile synchronously on first use                                                       | (a)    | A synchronous compile of a PBR variant takes tens of milliseconds on some devices, a visible stutter. Skipping one frame of an object that just appeared is far less visible, and `prepare()` avoids even that behind a loading screen.                                                                                                       |

---

## 5. Open questions

1. **Fragment texture units.** WebGL2 guarantees only 16 texture units per
   fragment shader. After the engine's own (environment, shadow atlas,
   cluster data, the BRDF lookup), a material has 11. Core PBR uses 5; all
   glTF material extensions together would use 18. Options: (a) a
   material's variant drops the least important extension textures when it
   exceeds the device's limit, with a warning; (b) refuse to create the
   material; (c) pack textures. Proposal: (a), with the priority order in
   design 10. Design 05's texture-unit ranges are set per shader stage from
   the device's reported limits accordingly.
2. **Mesh pool limits.** 64 K vertices per packed mesh keeps 16-bit
   indices possible per mesh but the pool needs 32-bit indices; confirm the
   memory trade-off with B1's measurements.

---

## 6. Design

### 6.1 Meshes

```ts
const mesh = createMesh(renderContext, {
  attributes: {
    position: { format: 'float32x3', data: positions },
    normal: { format: 'float32x3', data: normals },
    uv0: { format: 'float32x2', data: uvs },
  },
  indices: indexArray, // Uint16Array or Uint32Array; optional
  parts: [{ start: 0, count: indexArray.length, topology: 'triangle-list' }],
  label: 'crate',
});
```

- **Attributes** (names are the engine's semantics): `position`, `normal`,
  `tangent` (`vec4`, w is handedness), `uv0`, `uv1`, `color0`, `joints0`,
  `weights0`. Any vertex format design 05 supports, so quantized data from
  glTF (`KHR_mesh_quantization`) uploads without expanding.
- **Interleaving**: attributes are interleaved into one vertex buffer per
  mesh (or per pool), which is faster to fetch than separate buffers.
- **Parts**: index ranges with a topology, each drawn with the material in
  the matching slot of the mesh component.
- **Bounds**: a local `BoundingBox` and `BoundingSphere` computed at
  creation (design 02), used by culling (design 06).
- **CPU data** is kept (decision MS9), readable through `mesh.readAttribute`
  and `mesh.readIndices` for physics and picking.
- `mesh.dispose()` releases GPU buffers and its pool space.

**Primitives** (`createBoxMesh`, `createSphereMesh`, `createPlaneMesh`,
`createCylinderMesh`, `createCapsuleMesh`, `createConeMesh`,
`createQuadMesh`) produce normals, UVs and tangents, are centered at the
origin, face `+Z` where they have a front (decision X10 in design 04), and
match the shapes design 14's colliders use, so a physics capsule and a
capsule mesh line up.

### 6.2 The mesh component

```ts
interface MeshEcsComponent {
  mesh: Mesh;
  materials: Material[];      // one per part; a single material applies to all parts
  castsShadows: boolean;      // default true
  receivesShadows: boolean;   // default true
  category: number;           // matched against cameras' cullingMask, default 1
  layer: number;              // transparent ordering, as for sprites (design 07), default 0
  tint: Color;                // per-object multiplier, default white (decision MS6)
  levelsOfDetail: MeshLevelOfDetail[]; // design 06 §6.8.4, default none
}
```

The mesh extraction system declares `[meshId, transformId]`. From its
journals it assigns and frees GPU scene slots (design 06 §6.7); each frame
it pushes a draw item per visible part into the phase the part's material
selects (§6.4), and shadow-caster items into each shadow view (design 09).

### 6.3 Materials and their blocks

A material is a shader (sources or hooks), its parameter values, textures
and render state.

- When the shaders are prepared, the preprocessor removes every loose
  non-sampler `uniform` declaration from both stages and emits one
  `layout(std140) uniform ForgeMaterial { ... };` block containing them,
  in both stages. Members of a block without an instance name are in
  global scope, so shader code that reads `u_tint` doesn't change.
- The material computes the block's std140 layout from the declarations
  (the parser already reads types and array sizes) and keeps a CPU-side
  `ArrayBuffer`. `setUniform` validates as today (design decisions from
  the shader-uniform-declarations work stand), writes into the buffer and
  bumps the material's `version`.
- All materials' blocks live in shared uniform buffers at aligned
  offsets; a block is uploaded only when its `version` changed since the
  last upload, and bound with one `bindBufferRange` (bind group 2).
- Samplers stay loose uniforms and get group 2 texture units at link time
  (design 05 §6.6).
- `RenderContext`'s unused global uniform map is deleted; per-frame and
  per-view values live in the engine's frame and view blocks.

### 6.4 Render state and phases

| Field              | Values                                                                                       | Phase           |
| ------------------ | -------------------------------------------------------------------------------------------- | --------------- |
| `blendMode`        | `'opaque'`                                                                                   | `opaque`        |
|                    | `'mask'` (alpha tested against `alphaCutoff`, default 0.5)                                    | `alphaTested`   |
|                    | `'blend'` (straight alpha over), `'premultiplied'`, `'additive'`, `'multiply'`                | `transparent`   |
| `doubleSided`      | Culling off; back faces get flipped normals                                                  |                 |
| `depthWrite`, `depthTest` | Defaults follow the blend mode (transparent: test, no write)                          |                 |
| `depthBias`        | Constant and slope-scaled, for coplanar geometry                                             |                 |

Blend modes map to design 05's named blend states, which keep the
premultiplied-destination contract (`AGENTS.md`).

### 6.5 Variants

A pipeline is looked up by a key interned from:

- **material features**: which textures are bound (`FORGE_HAS_NORMAL_MAP`,
  ...), vertex colors, alpha mode, double-sided, the material's hooks;
- **mesh features**: tangents present, skinned, morph targets, quantized
  positions;
- **pass**: color, depth, shadow;
- **pipeline features**: what the view's pipeline includes that shaders
  must know about (lighting, ambient occlusion, fog);
- **target**: color format and MSAA sample count.

Each distinct key compiles once, on demand. Programs are shared between
pipelines with the same sources and defines.

### 6.6 `UnlitMaterial`

```ts
const material = new UnlitMaterial(renderContext, {
  color: Color.white,
  colorTexture: crateTexture,  // optional; sRGB
  vertexColors: false,
  blendMode: 'opaque',
  doubleSided: false,
});
```

Unlit materials aren't affected by lights or fog of other features, and
are what 3D debug and UI-in-world content use when it shouldn't be shaded.

### 6.7 The engine shader library

Includes every engine and custom shader can use:

| Include         | Provides                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `forge/frame`   | Time, frame index, exposure                                                                                       |
| `forge/view`    | View rotation and projection, camera position (high and low), viewport                                            |
| `forge/object`  | Fetching the object's basis, translation, tint and flags from the GPU scene by instance index; `forge_objectToView`, `forge_objectNormalToWorld` |
| `forge/vertex`  | The standard vertex path: read attributes, apply morph and skin (design 12), the vertex hook, transform             |
| `forge/surface` | The `ForgeSurface` struct and its defaults                                                                         |
| `forge/output`  | Writing color (straight alpha, as `AGENTS.md` requires), depth-only and shadow outputs                            |

The existing includes (noise, SDF shapes, gradients) stay available.

### 6.8 Shader hooks

A material can supply any of these functions; the engine's shaders call
them where shown:

```glsl
// Object space, before skinning's result is transformed to view space.
void forge_vertex(inout ForgeVertex vertex);

// The material's surface: base color, alpha, normal, emissive, and the
// shading model's own fields (metallic, roughness, occlusion for PBR).
void forge_surface(inout ForgeSurface surface, in ForgeSurfaceInput input);

// Custom shading models only: one light's contribution, and ambient.
vec3 forge_light(in ForgeSurface surface, in ForgeLight light, in ForgeSurfaceInput input);
vec3 forge_ambient(in ForgeSurface surface, in ForgeSurfaceInput input);

// After shading: fog, tints, stylization.
vec4 forge_finalColor(vec4 color, in ForgeSurfaceInput input);
```

```ts
const grass = new PbrMaterial(renderContext, {
  baseColorTexture: grassTexture,
  blendMode: 'mask',
  hooks: {
    vertex: windVertexHook, // a ForgeShaderSource with forge_vertex and its uniforms
  },
});
grass.setUniform('u_windStrength', 0.4);
```

- Hooks are `ForgeShaderSource`s (they keep `#pragma forge name(...)` and
  can include engine and game includes). Their loose uniforms join the
  material's block; their samplers get material texture units.
- The vertex hook runs in every pass, so displaced geometry casts the
  matching shadow. The surface hook runs in the color pass, and in depth
  and shadow passes when the material is alpha-tested (only `alpha` is
  used there).
- `shadingModel: 'custom'` makes the engine call `forge_light` per light
  (design 09 supplies `ForgeLight` with direction, color, attenuation and
  shadow) and `forge_ambient` once, instead of its own BRDF. That's how a
  toon shader keeps clustered lights and shadows.
- Hooks are part of the variant key, so materials sharing a hook source
  share programs.

### 6.9 Custom materials

```ts
const hologram = createCustomMaterial(renderContext, {
  passes: {
    color: { vertex: hologramVertex, fragment: hologramFragment },
    // no depth or shadow entry: it doesn't write depth or cast shadows
  },
  blendMode: 'additive',
});
```

Custom shaders include `forge/view` and `forge/object` to position
vertices with the GPU scene and camera-relative math; a custom shader that
ignores them still works for objects near the origin, and the guide shows
why to use them. `SpriteMaterial` becomes a custom material over the sprite
instance layout (design 07), with the existing `spriteMask` requirement.

### 6.10 Compilation

- Pipelines compile through design 05's asynchronous path when
  `KHR_parallel_shader_compile` exists.
- A draw item whose pipeline is still compiling is skipped this frame and
  counted (`draws skipped`). It appears when ready, usually within a few
  frames.
- `await renderContext.prepare(world)` walks every mesh component's
  materials and mesh features, every light and camera, and the pipelines in
  use, compiles every variant they need, and resolves when all are linked.
  Games call it behind loading screens and after spawning new kinds of
  content.
- Without parallel compilation, `prepare()` compiles synchronously, so the
  wait still happens behind the loading screen rather than mid-game.

### 6.11 Performance

- Binding a material whose block didn't change costs one buffer-range bind
  and its textures; no uniform calls.
- Variant lookup is an interned integer key per draw item, computed when a
  material or mesh changes, not per frame.
- B1 targets from design 06 (≤ 1 ms draw submission for its ~250
  batches).

### 6.12 Testing

- Unit: block layout against hand-computed std140 offsets (scalars,
  vectors, matrices, arrays, structs); declaration gathering keeps shader
  text valid; variant keys; mesh creation, interleaving, bounds, pool
  packing and index rebasing; primitives' normals and tangents; MikkTSpace
  against reference values for the glTF sample tangent test model.
- Browser: every variant the engine can produce for `UnlitMaterial` and
  the hooks demos compiles and links (design 01's shader-variant spec).
- Golden: unlit textured primitives; alpha modes; double-sided; hooks
  (wind, dissolve, toon) with shadows once design 09 lands.
- Allocation spec for mesh extraction; B1 batching counters.
