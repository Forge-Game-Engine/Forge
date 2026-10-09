# Design 09: Lighting and Shadows

|                                       |                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                     |
| **Kind**                              | Feature                                                                                               |
| **Engine version at time of writing** | `0.26.1`                                                                                              |
| **Program**                           | [Forge 3D](./README.md), milestone M3                                                                 |
| **Depends on**                        | [08 Meshes, materials and shaders](./08-meshes-materials-and-shaders.md)                             |
| **Related**                           | [10 PBR and environment lighting](./10-pbr-and-environment-lighting.md) (the BRDF that uses these lights), [11 glTF](./11-gltf-and-asset-lifetime.md) (`KHR_lights_punctual`) |

## 0. Targeted modules

| Path                                                   | Change | Notes                                                                                                   |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------- |
| `src/lighting/` (new module, `@forge-game-engine/forge/lighting`) | New | Everything below; `package.json` `exports` and `src/index.ts` updated                         |
| `src/lighting/components/`                             | New    | `DirectionalLightEcsComponent`, `PointLightEcsComponent`, `SpotLightEcsComponent`                        |
| `src/lighting/light-extraction-system.ts`              | New    | Visible lights per view, light data, clusters, shadow views                                             |
| `src/lighting/clusters/`                               | New    | The cluster grid, CPU light assignment, cluster textures                                                |
| `src/lighting/shadows/`                                | New    | Cascades, the local shadow atlas and its allocator, caching, shadow passes                              |
| `src/lighting/shaders/`                                | New    | `forge/lights`, `forge/shadows` includes; the `ForgeLight` struct for hooks                             |
| `src/lighting/feature.ts`                              | New    | `lighting()`: the pipeline feature (design 06) that adds passes, extraction and includes               |
| `documentation-site/docs/docs/lighting/` (new)         | New    | `index.md`, `lights.md`, `shadows.md`, `light-units-and-exposure.md`                                    |

---

## 1. Summary

Forge has no lights. This design adds the three punctual light types every
engine and glTF (`KHR_lights_punctual`) have, in physical units, with
shadows, rendered with **clustered forward** shading (README G2): the view
is divided into a grid of cells in screen space and depth, each cell lists
the lights that reach it, and each pixel loops over only its cell's
lights. WebGL2 has no compute shaders, so the lists are built on the CPU
each frame and uploaded as textures. That handles hundreds of visible
lights at the cost of a few hundred microseconds of CPU time.

Shadows:

- **Directional light** (the sun): up to four **cascades** in a depth
  texture array, fitted to the view, stabilized so they don't shimmer as
  the camera moves, blended at their boundaries.
- **Spot and point lights**: tiles in one **shadow atlas** (a point light
  uses six), sized by how large the light is on screen, and **cached**:
  a tile is re-rendered only when its light or something casting into it
  moved.
- **Filtering**: hardware depth comparison with a multi-tap kernel, a
  softness per light, and contact-hardening soft shadows for the sun as a
  quality setting.

Lights are ordinary components on entities with transforms (a spot light
aims along its `-Z`, README §4.1). The shading model that turns lights into
color is design 10's PBR, or a material's own `forge_light` hook (design
08).

---

## 2. Scope

### In scope

- Directional, point and spot lights; physical units; range and
  attenuation.
- Clustered light lists on the CPU; light and cluster data on the GPU.
- Directional cascades; the local light atlas; caching; budgets.
- Filtering, biases, soft shadows.
- `ForgeLight` for custom shading models.
- Debug views (clusters, cascades, atlas).

### Out of scope

- **The BRDF**: design 10.
- **Ambient and environment light**: design 10.
- **Area lights, light cookies, volumetric lighting.** Later features; the
  light data layout leaves room for a type field.
- **Baked lighting and light probes.** Forge has no bake tooling; glTF has
  no standard for it.
- **2D lights** for sprites (design 07, out of scope).

---

## 3. Phases

### Phase 1: Lights and light data

| #   | Task                    | Description                                                                                                       | Size |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | Components              | §6.1, with defaults and units                                                                                     | S    |
| 1.2 | Extraction              | §6.2: visible lights per view, light data texture, directional lights in the view block                          | M    |
| 1.3 | `ForgeLight` and includes | §6.5; a Lambertian test material through design 08's `forge_light` hook                                       | M    |
| 1.4 | `lighting()` feature    | Registers extraction and includes on a pipeline                                                                   | S    |

**Definition of done:** the known-illuminance analytic test (design 01
§6.4.4) passes for a directional light; a point light's measured falloff
between two distances matches inverse-square within the window (§6.1.3).

### Phase 2: Clusters

| #   | Task                    | Description                                                                                      | Size |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------ | ---- |
| 2.1 | Grid                    | §6.3.1: tiles and exponential depth slices per view                                              | S    |
| 2.2 | CPU assignment          | §6.3.2: count, prefix sum, fill; sphere and cone tests against cells                             | M    |
| 2.3 | Upload and shading loop | Cluster and index textures; the shader loop                                                      | M    |
| 2.4 | Debug view              | Lights per cell as a heat map overlay                                                            | S    |

**Definition of done:** B3 (256 point lights) meets its budget; cluster
assignment equals a brute-force assignment in unit tests.

### Phase 3: Directional shadows

| #   | Task                    | Description                                                                                         | Size |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------- | ---- |
| 3.1 | Cascades                | §6.4.1: splits, stabilized fitting, caster culling towards the light                                | M    |
| 3.2 | Shadow pass             | Shadow-caster phases through design 08's shadow variants                                            | M    |
| 3.3 | Sampling                | Comparison sampling, filtering kernel, cascade blending, distance fade, normal offset               | M    |
| 3.4 | Debug view              | Cascade colors                                                                                      | S    |

**Definition of done:** the shadow-coverage analytic test passes; golden
scenes for cascade transitions show no visible seams; a slow camera pan
shows no shimmering (an e2e test compares shadow edges between frames).

### Phase 4: Local light shadows

| #   | Task                    | Description                                                                                         | Size |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------- | ---- |
| 4.1 | Atlas and allocator     | §6.4.2: tiles by priority; points as six tiles                                                      | M    |
| 4.2 | Caching                 | §6.4.3: re-render only on change                                                                    | M    |
| 4.3 | Spot and point sampling | Face selection for points; tile borders                                                             | M    |
| 4.4 | Debug view              | The atlas on screen                                                                                 | S    |

**Definition of done:** B5 meets its budget; a static scene with eight
shadowed spots renders no shadow tiles after the first frame.

### Phase 5: Soft shadows and guides

| #   | Task                       | Description                                                                         | Size |
| --- | -------------------------- | ----------------------------------------------------------------------------------- | ---- |
| 5.1 | Contact-hardening shadows  | Blocker search and variable kernel for the directional light (`softness` quality)   | M    |
| 5.2 | Guides                     | The four lighting guides; a demo with all light types and shadows                   | M    |
| 5.3 | Changelog                  | `#### Added`                                                                        | S    |

**Definition of done:** the guides and demo are on the docs site.

---

## 4. Decision log

| #   | Decision                                 | Options                                                                                                                          | Chosen | Rationale, trade-offs, assumptions                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L1  | Many lights                              | (a) Clustered, assigned on the CPU; (b) tiles in screen space only; (c) every object loops over every light, as Three.js does   | (a)    | (c) costs every pixel every light. Screen tiles without depth slices put far and near lights in the same list. Clustering is Godot's, Bevy's and PlayCanvas's approach; on WebGL2, Bevy and PlayCanvas build clusters on the CPU, as this does.                                       |
| L2  | Light data storage                       | (a) Point and spot data in a float texture, directional in the view block; (b) everything in uniform blocks                       | (a)    | A 16 KB block holds about 256 lights at 64 bytes each, a hard ceiling. A texture holds thousands. Directional lights are few and read by every pixel, so a block suits them.                                                                                                       |
| L3  | Units                                    | (a) Physical: lux for directional, lumens for point and spot, exposure in EV100 (design 10); (b) unitless intensities             | (a)    | glTF's lights are physical, so imported scenes light correctly; values copied from references and photography mean the same thing. Unitless intensities only stay consistent within one game.                                                                                     |
| L4  | Spot intensity                           | (a) A spot light of `Φ` lumens has the same intensity per steradian as a point light of `Φ` (`I = Φ / 4π`); (b) energy conserved over the cone | (a)  | Narrowing a spot's cone then doesn't make it brighter, which is what artists expect when tuning a cone. glTF gives intensity in candela, which converts exactly under (a).                                                                                                          |
| L5  | Local shadow storage                     | (a) One atlas, points as six tiles; (b) a cube map per point light and a texture per spot                                        | (a)    | WebGL2 has no cube map arrays, so (b) binds a texture per shadowed light, quickly exceeding the fragment texture units (design 08 open question 1). One atlas is one binding and a fixed memory budget.                                                                              |
| L6  | Cascade fitting                          | (a) Sphere-fit cascades snapped to whole texels; (b) tight fits to each split's corners                                          | (a)    | Tight fits change size and position every frame, which makes shadow edges crawl. Sphere fits keep a constant size and texel snapping keeps their position stable, at the cost of some resolution.                                                                                  |
| L7  | Caching                                  | (a) Re-render a tile only when its light or a caster in its frustum changed; (b) every frame                                     | (a)    | Most local lights and casters don't move. Change ticks (design 03) and the transform's `changedTick` (design 04) make the check cheap. Cascades follow the camera, so they render every frame.                                                                                       |
| L8  | Shadowed directional lights              | (a) One per view casts cascaded shadows; others are unshadowed; (b) any number                                                  | (a)    | One sun is the overwhelming case; each additional cascaded light multiplies shadow rendering.                                                                                                                                                                                      |
| L9  | Light range                              | (a) Finite, defaulting from intensity, with a smooth window to zero at the range; (b) infinite, as glTF allows                  | (a)    | Clusters need a bound. The window (`(1 - (d/r)⁴)²`) removes the hard edge a cut-off would show. A glTF light without a range gets the default.                                                                                                                                   |

---

## 5. Open questions

1. **Defaults per platform.** Cascade count, atlas size and filter taps
   differ in cost a lot between desktop and phones. Options: (a) one set of
   defaults, games tune; (b) defaults chosen from the device's
   capabilities. Proposal: (a) for now, with the guide giving a mobile
   preset; revisit after M3's mobile measurements.
2. **Cluster grid size.** 16 × 9 tiles by 24 slices is a common starting
   point. Confirm with B3 measurements whether fewer slices are faster on
   integrated GPUs.

---

## 6. Design

### 6.1 Lights

#### 6.1.1 Components

```ts
interface DirectionalLightEcsComponent {
  color: Color;            // sRGB, default white
  illuminance: number;     // lux, default 10,000
  castsShadows: boolean;   // default false
  shadow: DirectionalShadowSettings;
}

interface PointLightEcsComponent {
  color: Color;
  intensity: number;       // lumens, default 800 (a household bulb)
  range: number | null;    // meters; null derives it from intensity (§6.1.3)
  radius: number;          // emitter size for soft specular and shadows, default 0
  castsShadows: boolean;
  shadow: LocalShadowSettings;
}

interface SpotLightEcsComponent extends Omit<PointLightEcsComponent, 'shadow'> {
  innerConeAngle: number;  // radians from the axis, default 0
  outerConeAngle: number;  // radians from the axis, default π/4
  shadow: LocalShadowSettings;
}
```

A light's position and direction come from its `TransformEcsComponent`:
directional and spot lights shine along their world `-Z`.

Shadow settings (all with defaults): `depthBias`, `normalBias`,
`softness` (filter radius in texels), and for the directional light
`cascadeCount` (1 to 4, default 4), `maxDistance` (default 100 m),
`splitBlend` (between uniform and logarithmic splits, default 0.75) and
`cascadeBlendWidth`.

#### 6.1.2 Units

- Directional: illuminance `E` in lux; radiance reaching a surface facing
  the light is `E` times the color.
- Point and spot: luminous power `Φ` in lumens; intensity `I = Φ / 4π`
  candela (decision L4); illuminance at distance `d` is `I / d²` times the
  window.
- Exposure (design 10) converts these to display values, so the defaults
  (a 10,000 lux sun, an 800 lumen bulb) and the default camera exposure
  produce a well-exposed image without tuning.

#### 6.1.3 Range and attenuation

Attenuation is inverse-square times `(1 - (d / range)⁴)²`, clamped to
zero beyond `range`. When `range` is `null`, it's the distance where
illuminance falls to 0.01 lux, so a dim light has a small range and
clusters stay small.

### 6.2 Extraction

`registerLighting` (called by the `lighting()` feature) adds a light
extraction system in the `render` stage, ordered before mesh extraction
(design 08), declaring one query per light type with transforms. Per view
it:

1. culls point and spot lights by their range sphere (spots by a cone
   bound) against the view frustum;
2. writes visible lights into the view's light data texture (four
   `rgba32float` texels per light: position high and low parts relative to
   the camera, direction, color times intensity, range, cone, radius,
   shadow tile reference);
3. writes up to four directional lights into the view block;
4. builds clusters (§6.3);
5. creates shadow views for shadowed lights (§6.4), into which mesh
   extraction pushes shadow casters.

The textures are view resources of the frame graph, reused frame to frame
by the transient pool (design 06).

### 6.3 Clusters

#### 6.3.1 Grid

Each view gets a grid of `16 × 9` screen tiles (adjusted to the viewport's
aspect) and 24 depth slices spaced exponentially between the near plane and
the farthest visible light, so near slices are thin where precision
matters.

#### 6.3.2 Assignment

```text
for each visible local light:
  view-space bounding sphere -> range of tiles (projected rectangle) and slices (depth range)
  for each cell in that range:
    if sphere (or spot cone) intersects the cell's view-space box: count[cell]++
prefix sum of counts -> offset per cell
second pass: write light indices at offset[cell] + n
```

Outputs, uploaded per view per frame:

- an `rg32uint` texture of `(offset, count)` per cell;
- an `r16uint` texture of light indices (`r32uint` above 65,535 lights).

A cell holds at most 128 lights; beyond that the farthest are dropped and
the stats overlay counts it.

#### 6.3.3 Shading

The fragment shader finds its cell from `gl_FragCoord.xy` and its view
depth, reads `(offset, count)`, and loops over the lights, fetching each
light's data with `texelFetch`. Directional lights are looped from the
view block first.

### 6.4 Shadows

#### 6.4.1 Directional cascades

- Split distances blend uniform and logarithmic splits (`splitBlend`) up to
  `maxDistance`.
- Each cascade is fitted with the bounding sphere of its split's frustum
  slice (`Frustums.corners`, design 02), so its size is constant, and its
  origin is snapped to whole shadow-map texels in light space, so it moves
  in steps the filter hides.
- Casters are culled per cascade with the cascade's box extended back
  towards the light, so objects outside the view that cast into it are
  kept.
- Cascades render into a `depth24plus` (or `depth32float`) 2D array
  texture, one layer per cascade, 2048² by default.
- Sampling picks the first cascade containing the fragment, blends into
  the next within `cascadeBlendWidth`, and fades shadows out over the last
  10% of `maxDistance`.

#### 6.4.2 The local light atlas

- One `depth24plus` texture, 4096² by default, divided into power-of-two
  tiles by a quadtree allocator.
- Each frame, shadowed lights are ranked by projected screen size (and a
  game-set `priority`), and assigned tile sizes from 1024 down to 128;
  lights that don't fit go unshadowed this frame and the stats overlay
  says so.
- A spot light uses one tile with a perspective projection over its outer
  cone. A point light uses six tiles, one per cube face, each with a 90°
  projection plus a border of a few texels so filtering near face edges
  stays inside the tile; the shader picks the face from the major axis of
  the light-to-fragment vector.

#### 6.4.3 Caching

Each tile records, in the lighting feature's cache on the render context
(a derived GPU cache, README §4.4), the light's transform `changedTick`, its
settings version and the casters it last rendered. A tile is re-rendered
when the light changed, its tile size or position changed, or any caster
in its frustum has a newer `changedTick` or entered or left (mesh
extraction's journals). Static scenes render local shadows once.

#### 6.4.4 Filtering and bias

- The shadow pass applies constant and slope-scaled depth bias in the
  rasterizer (`depthBias` in the shadow variant's pipeline state).
- Receivers offset the lookup position along the surface normal by
  `normalBias` times the texel's world size, which removes acne without
  peter-panning.
- Lookups use comparison samplers (`sampler2DShadow`,
  `sampler2DArrayShadow`) with linear filtering, which compares and
  filters four texels per fetch, in a kernel sized by `softness` (one
  fetch at 0, nine fetches covering a 5 × 5 area at the default).
- Contact-hardening (Phase 5) searches for blockers first and scales the
  kernel with the blocker distance, so shadows are sharp at contact and
  soft far away; it's a per-light quality setting on the directional
  light.

### 6.5 `ForgeLight` for custom shading

Design 08's `forge_light` hook receives:

```glsl
struct ForgeLight {
  vec3 direction;    // from the surface towards the light, world-space orientation
  vec3 radiance;     // color x intensity x attenuation x cone, before shadows
  float shadow;      // 0 (fully shadowed) to 1 (lit)
  float distance;    // to the light; 0 for directional
  int type;          // directional, point, spot
};
```

The engine's loop builds one per light (directional, then the cell's
lights) and sums the hook's results. A toon material quantizes
`dot(normal, direction) * shadow` without reimplementing clustering or
shadows.

### 6.6 Performance

Budgets on the desktop reference:

| Work                                                         | Budget          |
| ------------------------------------------------------------ | --------------- |
| Light extraction and cluster assignment, 256 visible lights  | ≤ 0.5 ms CPU    |
| Cluster and light data uploads                               | ≤ 200 KB/frame  |
| Directional shadow views (4 cascades), culling and submission | ≤ 1.0 ms CPU    |
| Local shadow views, static scene                             | ≈ 0 (cached)    |
| Average lights per pixel in B3 at 1080p                      | ≤ 8             |

No allocation per frame (allocation specs for light extraction and shadow
setup).

### 6.7 Testing

- Unit: unit conversions; attenuation and window; cluster assignment
  against brute force for random lights and views; cascade splits,
  sphere fit and texel snapping (a camera moved by less than a texel
  produces the same cascade); atlas allocation and reallocation; cache
  invalidation from change ticks and journals.
- Analytic (design 01 §6.4.4): known illuminance; inverse-square ratio;
  inside and outside a spot cone; shadow coverage; no acne on a lit plane
  facing the light (all sampled pixels lit within tolerance).
- Golden: each light type; cascades with the debug colors; soft and hard
  shadows; point light shadows on all six faces; 256 lights; toon shading
  through `forge_light`.
- Benchmarks: B3, B5.
