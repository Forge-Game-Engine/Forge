# Design 06: Renderer and Frame Graph

|                                       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review (revised after solution review, §7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Kind**                              | Feature and breaking refactor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Engine version at time of writing** | `0.26.1`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Program**                           | [Forge 3D](./README.md), milestone M2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Depends on**                        | [04 Transforms](./04-transforms.md), [05 GPU device layer](./05-gpu-device.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Lands with**                        | [07 2D on the renderer](./07-2d-on-the-render-pipeline.md) and [13 Post-processing](./13-post-processing-and-anti-aliasing.md): Phase 2 here (with draw items and the sorted transparent phase, task 2.6) ships with Phase 1 of each                                                                                                                                                                                                                                                                                                                                                                                        |
| **Related**                           | [08 Meshes, materials and shaders](./08-meshes-materials-and-shaders.md) (mesh extraction, the change list, pass variants), [09 Lighting](./09-lighting-and-shadows.md) (lit views, shadow views, the change list), [10 PBR](./10-pbr-and-environment-lighting.md) (camera components, the transmissive phase), [12 Animation](./12-skeletal-and-morph-animation.md) (texel 3, deformed bounds, `lastVisibleFrame`), [13 Post-processing](./13-post-processing-and-anti-aliasing.md) (render scale, frame graph support, resolves), [15 Picking](./15-audio-particles-and-picking-in-3d.md) (message streams, `sceneDepth`) |

## 0. Targeted modules

| Path                                                                              | Change   | Notes                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/rendering/renderer/` (new)                                                   | New      | `Renderer` (`createRenderer`, `addPass`, `removePass`), features, passes, insertion points, the frame graph (with design 13's `beginPostProcess` and pending layers), the transient texture pool, the missing-feature check |
| `src/rendering/views/` (new)                                                      | New      | Per-camera views, phases (binned and sorted), draw items, batching                                                                                                                                                          |
| `src/rendering/gpu-scene/` (new)                                                  | New      | Object slots per world, the object data texture, change-driven uploads, world culling spheres from local bounds, per-slot hidden flags, the per-frame change list, culling arrays                                           |
| `src/rendering/systems/hierarchy-visibility-system.ts`                            | New      | The hierarchy visibility system: per-entity hidden-in-hierarchy flags for meshes and lights, re-resolved only for subtrees whose visibility or parent changed (§6.8.5)                                                      |
| `src/rendering/components/camera-component.ts`                                    | Modified | Projections with scaling modes, viewport, `order` (was `layer`), `clearColor: Color \| null`, `renderScale` (design 13); input fields move to controllers                                                                   |
| `src/rendering/controllers/` (new)                                                | New      | Pan-and-zoom (2D), orbit and fly (3D) camera controllers                                                                                                                                                                    |
| `src/rendering/camera-view.ts`                                                    | Modified | 3D views: matrices, frustum, rays, viewport conversions; the 2D fields kept for orthographic cameras                                                                                                                        |
| `src/rendering/render-context.ts`                                                 | Modified | `clearStrategy` removed; canvas context attributes (design 05 §6.11)                                                                                                                                                        |
| `src/rendering/systems/render-system.ts`, `present-system.ts`, `camera-system.ts` | Removed  | Replaced by extraction systems, the renderer system and controllers                                                                                                                                                         |
| `src/ui/utilities/create-ui-canvas.ts`, `src/ui/systems/ui-layout-system.ts`      | Modified | UI canvas cameras lose their render target; layout stops writing the camera                                                                                                                                                 |
| `src/rendering/debug/` (new)                                                      | New      | Debug drawing and the stats overlay                                                                                                                                                                                         |
| `src/rendering/render-target.ts`                                                  | Modified | Depth and MSAA; imported into the frame graph as camera destinations                                                                                                                                                        |
| `src/input/mouse/bindings/mouse-motion-binding.ts` (new)                          | New      | `MouseMotionBinding`, the mouse movement controllers bind (design 15 GP25)                                                                                                                                                  |
| `src/input/mouse/input-sources/mouse-input-source.ts`                             | Modified | The Y-down `delta` getter removed                                                                                                                                                                                           |
| `documentation-site/docs/docs/rendering/`                                         | Modified | `world-units-and-cameras.md`, `multipass-rendering.md` rewritten; new `renderer.md`, `custom-passes.md`, `debug-drawing.md`, `cameras-3d.md`                                                                                |
| `AGENTS.md`                                                                       | Modified | "Alpha Blending", "Device Pixels vs. CSS Pixels" and the e2e section rewritten around the output pass and camera destinations; the deleted `render-system.ts` and `present-system.ts` no longer cited                       |
| `CHANGELOG.md`                                                                    | Modified | `#### Changed`, `#### Added` and `#### Removed` entries, one task per phase (§3)                                                                                                                                            |

---

## 1. Summary

Forge draws today with one render system that handles every camera, every
sprite and every glyph, followed by a present system that composites
camera targets, and post-processing systems that each run on their own
camera's target. There's no depth, no perspective and no notion of passes;
adding a new kind of drawing means editing the render system.

This design replaces that with a **renderer**: a set of passes,
built per frame into a **frame graph** that knows which textures each pass
reads and writes, drops passes whose output nobody uses, reuses pooled
intermediate textures between passes whose uses don't overlap, and inserts
MSAA resolves. Engine features (shadows, opaque, sky, transparent, bloom,
tone mapping) register passes; whether a pass runs for a camera depends on
that camera's components, so one camera can bloom and another blur, as
Forge allows today. Games add passes at named **insertion points**, or
replace the renderer.

Above it:

- **Cameras** get perspective and orthographic projections (with scaling
  modes, so UI layout no longer writes the camera), a viewport, a
  composition `order`, and keep everything 2D games use. Input handling
  moves to controller components, one per camera.
- **Every camera renders into its own targets**, and an **output pass**
  writes its result to its destination with sRGB encoding, since WebGL2's
  canvas can't blend in linear space.
- **Extraction systems**, one per kind of renderable with fixed queries,
  turn components into **draw items**. Opaque and shadow items live in
  **retained bins** keyed by pipeline, material and mesh, updated from
  journals instead of re-sorted every frame; transparent items are sorted.
- The **GPU scene** keeps every mesh object's transform on the GPU per
  world, uploads only what changed (design 04's `changedTick`), and
  positions vertices relative to the camera at close to 64-bit precision.
- **Culling** runs over flat arrays of bounding spheres per view, with a
  tree for static objects.
- **Debug drawing** and a **stats overlay** come with the renderer.

---

## 2. Scope

### In scope

- The renderer, its features, passes, insertion points and frame graph.
- Cameras, projections and scaling modes, viewports, composition, the
  output pass and the camera view API (matrices, frustum, picking rays,
  viewport conversions).
- Camera controllers: 2D pan-and-zoom (what the camera does today), orbit
  and fly.
- Extraction, binned and sorted phases, draw items, batching, instancing
  and multi-draw.
- The GPU scene and camera-relative rendering.
- Visibility: frustum culling, render categories, hierarchical visibility,
  a static tree, and level-of-detail selection.
- Debug drawing and stats.

### Out of scope

- **What's drawn**: meshes and materials (design 08), lights and shadows
  (09), PBR (10), 2D renderables (07), post effects (13). This design
  defines how they plug in.
- **Occlusion culling.** Design 05, out of scope.
- **Split-screen input routing.** Viewports are in scope; deciding which
  player's input drives which camera is game code.
- **Motion vectors, temporal effects.** No temporal anti-aliasing or motion
  blur in this program (design 13).

---

## 3. Phases

### Phase 1: Cameras, views and controllers

Replaces today's camera with a camera component, views and camera
controllers, and makes controllers the only writers of a camera's
transform.

| #   | Task                 | Description                                                                                                                                                                                                                                                                                                                                                                                                            | Size |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | Camera component     | §6.2: projections with scaling modes, viewport, `order`, `clearColor`; 2D defaults unchanged                                                                                                                                                                                                                                                                                                                           | M    |
| 1.2 | Views                | §6.3: view and projection matrices (reversed depth when available), frustum, rays, conversions                                                                                                                                                                                                                                                                                                                         | M    |
| 1.3 | Controllers          | Pan-and-zoom (today's camera input, moved), orbit, fly; one per camera, enforced; inputs as actions; output fields for damping; ordered after `transformPropagationGroup`; unit and e2e tests (§6.11)                                                                                                                                                                                                                  | M    |
| 1.4 | Ownership            | UI canvases use the reference-resolution scaling mode and layout stops writing `verticalWorldUnits`; `clearStrategy` removed                                                                                                                                                                                                                                                                                           | S    |
| 1.5 | Migration            | Demos, e2e scenes and docs use the new fields and the pan-and-zoom controller                                                                                                                                                                                                                                                                                                                                          | M    |
| 1.6 | Mouse motion         | `MouseMotionBinding`: the frame's mouse movement for an `Axis2dAction`, `y` up; `MouseInputSource.delta` removed (design 15 GP25 and §6.4.3 specify both; pointer lock stays in design 15)                                                                                                                                                                                                                             | S    |
| 1.7 | Guides and changelog | `cameras-3d.md`; `world-units-and-cameras.md` rewritten (§6.13). `#### Changed`: camera `layer` → `order`; `verticalWorldUnits` → `projection.scaling`; pan and zoom inputs → `PanZoomCameraControllerEcsComponent`; `clearStrategy` → `clearColor: null`. `#### Added`: perspective cameras, orbit and fly controllers, `MouseMotionBinding`. `#### Removed`: `RenderContext.clearStrategy`, `MouseInputSource.delta` | S    |

**Definition of done:** `camera-pan-zoom` and every UI e2e spec pass; the
view API's conversions round-trip for both projections; nothing but a
controller writes a camera's transform; the controller tests pass.

### Phase 2: Renderer, frame graph and output (ships with design 07 Phase 1)

Replaces the render and present systems with the renderer, its features
and insertion points, the frame graph and the output pass.

| #   | Task                                 | Description                                                                                                                                                                                                                                                                                                                                                                  | Size |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 2.1 | Frame graph                          | §6.5: resources, pass declarations, compile (order, cull, lifetimes), pooled transient textures, execution                                                                                                                                                                                                                                                                   | L    |
| 2.2 | Renderer, features, insertion points | §6.4: per-frame and per-view passes; per-camera activation; adding, replacing and removing passes                                                                                                                                                                                                                                                                            | M    |
| 2.3 | Output pass                          | §6.4.3: every camera renders into its own targets; the output pass writes its destination in `order`, replacing the present system; canvas attributes change (design 05 §6.11). Until design 07 Phase 2, non-HDR views are `rgba8unorm` and the output pass copies without encoding                                                                                          | M    |
| 2.4 | Camera destinations                  | A camera's `renderTarget` is now its final destination. UI canvases, the space-shooter demo and the `hdr-tint-bloom`, `bloom-over-background`, `post-process-pixel-ratio` and `webgl-context-loss` e2e scenes drop the targets they used only to reach the present system                                                                                                    | M    |
| 2.5 | `registerRendering`                  | Registers extraction systems and the renderer system in the `render` stage; adds `MeshChangeListEcsComponent` (design 08) and records the world's renderer on the render context; the renderer system's `cleanup` frees the world's GPU state (§6.7.1)                                                                                                                       | S    |
| 2.6 | Draw items and the transparent phase | §6.6.1: draw items; the sorted transparent phase, sorted per view with design 07 §6.3's keys. Design 07 Phase 1 draws sprites, text and terrain through it                                                                                                                                                                                                                   | M    |
| 2.7 | Context loss                         | §6.12: the frame graph's plan cache and transient pool dropped on restore                                                                                                                                                                                                                                                                                                    | S    |
| 2.8 | Guides, `AGENTS.md` and changelog    | `renderer.md` (§6.13); `AGENTS.md`'s "Alpha Blending", "Device Pixels vs. CSS Pixels" and e2e sections rewritten around the output pass and camera destinations. `#### Changed`: `registerRendering` replaces registering the render, present and camera systems; a camera's `renderTarget` is its final destination. `#### Removed`: the render, present and camera systems | S    |

**Definition of done:** with design 07 Phase 1 and design 13 Phase 1,
every 2D e2e spec passes and every golden is unchanged except their
reviewed differences (MSAA edges on cameras that rendered into targets,
design 07 S16); `render-system.ts` and `present-system.ts` are deleted;
creating, rendering and stopping 20 worlds returns the device's resource
count and bytes to their baseline.

### Phase 3: Phases and batching

Sorts draw items into binned phases and batches them, so identical meshes
and materials draw in one call and an unchanged frame does no bin work.
Design 08's meshes arrive in M3, so this phase is checked with a test
renderable.

| #   | Task                | Description                                                                                                                                                                                                         | Size |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 3.1 | Binned phases       | §6.6: binned phases for opaque, alpha-tested and shadow casters, and the depth prepass and opaque passes every renderer has (§6.4.1); the transparent phase is task 2.6                                             | M    |
| 3.2 | Bins                | §6.6.2: retained, updated from extraction journals, design 08's change list and materials' `featureKey`                                                                                                             | M    |
| 3.3 | Object index lists  | §6.6.3: per-view lists read at a per-draw offset, the same with and without multi-draw; the `FORGE_DRAW_ID` prelude; the `ForgeDraw` table in one range per draw call, aligned to `UNIFORM_BUFFER_OFFSET_ALIGNMENT` | M    |
| 3.4 | Multi-draw          | Batches with the same pipeline and material over meshes in a shared buffer merge                                                                                                                                    | S    |
| 3.5 | Custom phases       | A game defines a phase, an extraction system and a pass (the custom-passes guide)                                                                                                                                   | S    |
| 3.6 | Test renderable     | An instanced-quad extraction in `e2e/fixtures/scenes/gpu-scene-static.ts` with 50,000 static and 10,000 dynamic items, which exercises bins, slots, culling and the change list before design 08's meshes exist     | M    |
| 3.7 | Guide and changelog | `custom-passes.md` (§6.13); `#### Added`: binned phases, custom phases                                                                                                                                              | S    |

**Definition of done:** 10,000 copies of the test quad with one material
draw in one call; a frame in which nothing changed does no bin work; the
custom-passes guide's example runs as a demo; the test renderable draws the
same image with `WEBGL_multi_draw` masked as with it.

### Phase 4: GPU scene and culling

Keeps per-object data on the GPU, uploaded only when it changes, with
camera-relative positions and per-view culling.

| #   | Task                      | Description                                                                                                                                                                                                                                              | Size |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 4.1 | Slots and journals        | §6.7.1: a slot per mesh object, per world, from extraction's journals; per-world state freed by the renderer system's `cleanup`                                                                                                                          | M    |
| 4.2 | Object data texture       | §6.7.2: rows written for changed dynamic transforms and for static ones from their journals; texel 3 from its inputs; world culling spheres from local bounds; the per-frame change list                                                                 | M    |
| 4.3 | Camera-relative positions | §6.7.3: high and low translation; shader functions every material uses                                                                                                                                                                                   | M    |
| 4.4 | Culling                   | §6.8: every view culled before the frame graph is built; sphere tests over flat arrays; categories; hidden slots skipped (§6.8.5); lit-view flags; `lastVisibleFrame`                                                                                    | M    |
| 4.5 | Hidden subtrees           | §6.8.5: the hierarchy visibility system from `[visibilityId]` and `[parentId]` journals and value comparisons; per-slot hidden flags and change-list entries in the GPU scene update; flags read by light extraction (design 09) and picking (design 15) | S    |
| 4.6 | Static tree and LOD       | §6.8.3, §6.8.4: the chosen level per camera and slot, shadow views' levels, LOD tests and golden                                                                                                                                                         | M    |
| 4.7 | Context loss              | §6.12: the object data mirror as the texture's restore source; the `webgl-context-loss` GPU scene case, built from task 3.6's test renderable                                                                                                            | S    |
| 4.8 | Changelog                 | `#### Added`: levels of detail on mesh components                                                                                                                                                                                                        | S    |

**Definition of done:** the `gpu-scene-static` scene uploads nothing and
scans no static slots after the first frame (design 08 Phase 1 repeats
the check with meshes); hiding an ancestor removes its descendants from
every view in the same frame, and a frame with no visibility or parent
change walks no subtree; the depth-precision analytic test (design 01)
passes on the backend matrix (design 01 Phase 6); culling of 50,000
objects costs ≤ 0.5 ms; the LOD tests and golden pass; the GPU scene
restores after a context loss.

### Phase 5: Debug drawing and stats

Adds debug drawing, the stats overlay and the M2 demo.

| #   | Task                | Description                                                                                     | Size |
| --- | ------------------- | ----------------------------------------------------------------------------------------------- | ---- |
| 5.1 | Debug drawing       | §6.9: lines, boxes, spheres, arrows, frustums, grids; depth-tested or on top; fixed-step shapes | M    |
| 5.2 | Stats overlay       | Frame time, draw calls, triangles, uploads, skipped draws, per-pass GPU time                    | S    |
| 5.3 | Demo                | A perspective grid with orbit and fly controllers and debug shapes (the M2 demo)                | S    |
| 5.4 | Guide and changelog | `debug-drawing.md` (§6.13); `#### Added`: debug drawing, the stats overlay                      | S    |

**Definition of done:** the M2 demo runs on the docs site; debug drawing
allocates nothing per frame.

---

## 4. Decision log

| #   | Decision                              | Options                                                                                                                                                                                                                                                                                                   | Chosen | Rationale, trade-offs, assumptions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Renderer structure                    | (a) A frame graph built per frame from passes; (b) a fixed list of passes with hand-managed targets                                                                                                                                                                                                       | (a)    | The established technique (Frostbite's frame graph, Unity's render graph, Bevy's render graph). A pass declares what it reads and writes; the graph orders it, provides its targets and releases them. Hand-managed targets are how today's bloom and blur systems ended up keeping private scratch targets in `WeakMap`s. On WebGL2 the graph reuses pooled textures of the same descriptor; it can't alias memory between different formats.                                                                                                                                                                                                            |
| R2  | Getting data from the ECS             | (a) Extraction systems with fixed declared queries writing per-frame draw lists on the render context; (b) a separate render world                                                                                                                                                                        | (a)    | Forge runs on one thread, so a second world buys no parallelism and costs a copy. Extraction systems keep the "fixed query" rule and are the extension point for new renderables.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| R3  | Per-object data on the GPU            | (a) A persistent GPU scene (object data texture) plus per-view lists of object indices; (b) uploading every visible object's matrix every frame                                                                                                                                                           | (a)    | (b) uploads 64 bytes per visible object per frame (3 MB for B1). (a) uploads only objects that moved, plus 4 bytes per visible object for the index list. Three.js's `BatchedMesh` reads per-object data from a texture the same way.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| R4  | Object data storage                   | (a) A float texture read with `texelFetch`; (b) uniform buffer arrays                                                                                                                                                                                                                                     | (a)    | Uniform blocks are guaranteed only 16 KB (256 matrices). A texture holds millions of objects and is read with exact integer addressing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| R5  | Large-world precision                 | (a) Translation as high and low `float32` parts, subtracted from the camera's in the shader; (b) re-uploading camera-relative matrices every frame; (c) moving the world origin                                                                                                                           | (a)    | README G4; the relative-to-eye technique Cesium uses. Keeps the GPU scene valid while the camera moves, unlike (b), and needs no game cooperation, unlike (c). GLSL ES 3.00 has no `precise` qualifier, so Phase 4 tests it on every ANGLE backend.                                                                                                                                                                                                                                                                                                                                                                                                       |
| R6  | Camera input                          | (a) Controller components and systems that write the camera's transform, one per camera; (b) keep input fields on the camera                                                                                                                                                                              | (a)    | A camera describes a view. Today's camera component also holds pan and zoom input, which made it a 2D controller; 3D needs other controllers. Each controller system is the one writer of its camera's `local` transform and zoom, and a second controller on the same camera throws.                                                                                                                                                                                                                                                                                                                                                                     |
| R7  | Orthographic depth range default      | (a) `near: -1000`, `far: 1000` relative to the camera; (b) positive near and far                                                                                                                                                                                                                          | (a)    | A 2D camera sits at `z = 0` with its sprites, so the range extends both ways and 2D games never think about depth.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| R8  | Compositing cameras and the canvas    | (a) Every camera renders into its own targets; an output pass writes the destination, encoding sRGB, in camera `order`; (b) let cameras without effects draw straight into the canvas                                                                                                                     | (a)    | WebGL2's canvas can't portably be an sRGB target (`drawingBufferStorage` with `SRGB8_ALPHA8` isn't available in every browser), so drawing into it directly blends in gamma space, against README G3; and an sRGB multisampled target can't be resolved into the canvas, since a resolve needs matching formats. Bevy and Unity's linear web path also always go through an intermediate. Cost: one full-screen pass per camera destination, fused with tone mapping and anti-aliasing whenever those run.                                                                                                                                                |
| R9  | Culling                               | (a) Brute-force sphere tests over flat arrays, plus a tree for static objects; (b) a dynamic tree for everything                                                                                                                                                                                          | (a)    | A sphere against six planes in a tight loop over typed arrays does 50,000 objects in well under a millisecond; a dynamic tree costs refitting for moving objects. Static objects get a tree built when the static set changes.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| R10 | Camera `layer`                        | (a) Rename to `order`; (b) keep `layer`                                                                                                                                                                                                                                                                   | (a)    | Sprites also have a `layer` (their draw layer). Two meanings of one word in the rendering API is one too many.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| R11 | How games extend the renderer         | (a) Features and passes at named insertion points, plus replacing the whole renderer; (b) editing an exposed graph                                                                                                                                                                                        | (a)    | Insertion points are stable across engine versions; an exposed graph would make every internal change a breaking one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| R12 | Which effects apply to which camera   | (a) Features register passes once; each pass decides per view from the camera's components (bloom, tone mapping, blur, ambient occlusion); (b) renderer-wide effects                                                                                                                                      | (a)    | Today the space-shooter demo blurs only its background camera and blooms only its foreground camera; (b) can't express that. Bevy keeps the same model: effects are camera components that per-view passes read.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| R13 | Depth prepass                         | (a) Runs for a view whenever its opaque or alpha-tested phase has items; (b) off; (c) a camera setting                                                                                                                                                                                                    | (a)    | It costs a second vertex pass and saves shading every covered fragment, which with clustered lights is the main GPU cost; ambient occlusion needs its depth and normals. Deciding from the data means views with only sprites, text and terrain never run it, and views with opaque or alpha-tested meshes always do (lit or unlit, with either projection), with nothing to configure. It's one of the passes every renderer has (§6.4.1). It draws design 08's `depth` or `depthNormals` pass variants, and an item is skipped in every pass until all of its variants are ready (design 08 §6.10.1), so the prepass and the color pass never disagree. |
| R14 | Opaque and shadow phases              | (a) Retained bins keyed by pipeline, material and mesh, updated from journals and versions; (b) sort every visible item every frame                                                                                                                                                                       | (a)    | With a depth prepass, front-to-back order buys little, and re-sorting 50,000 items each frame is work proportional to scene size rather than to change. Bevy moved its opaque phases from sorting to bins for this reason. Transparent items still need a sort.                                                                                                                                                                                                                                                                                                                                                                                           |
| R15 | Perspective far plane default         | (a) 1000 m on every device; (b) infinite where reversed depth is available                                                                                                                                                                                                                                | (a)    | `EXT_clip_control` isn't in every browser, so (b) would make culling and anything reading the view's far distance differ by browser. Reversed depth still improves precision where it's available.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| R16 | Name of the pass graph                | (a) `Renderer`, from `createRenderer(renderContext, { features })`, with `addPass` and `removePass`; (b) `RenderPipeline`, from `createRenderPipeline`                                                                                                                                                    | (a)    | Decided with the product owner. (b) collides with design 05's `device.createRenderPipeline` and `GpuRenderPipeline`, WebGPU's name for a program plus fixed-function state, and design 08's variant keys ended up using the word in both senses. With (a), pipeline means GPU pipeline state only (README §4.5). Godot (`RenderingDevice.render_pipeline_create`) and Bevy (`RenderPipelineDescriptor`) also keep "render pipeline" for GPU state, and name the frame's pass structure otherwise (Godot's renderers, Bevy's render graph).                                                                                                                |
| R17 | Hidden subtrees for meshes and lights | (a) One system keeps a hidden flag per entity and re-resolves only the subtrees whose `visible` value, visibility component or parent changed; (b) a per-frame walk of every mesh and light subtree, as design 07's draw-order walk does for 2D; (c) `isVisibleInHierarchy` per slot and light each frame | (a)    | (b) and (c) cost time in proportion to the scene every frame, against B1's budget of about zero for a still scene (§6.10). Bevy propagates inherited visibility only from entities whose visibility or parent changed. Forge doesn't track writes (design 03 E3), so the system compares each `VisibilityEcsComponent.visible` with the value it last read, which costs one comparison per entity that has the component, and takes component and parent changes from journals. Design 07's draw-order walk keeps resolving sprites, text, terrain and masks, since it visits them every frame for draw order anyway.                                     |

---

## 5. Open questions

In priority order.

1. **MSAA default on phones.** 4× MSAA on a high-density phone screen is
   expensive in a 3D scene. Options: (a) 4× everywhere (today's canvas
   behavior); (b) 4× on desktop, off on high-density mobile, with FXAA
   (design 13) instead. Proposal: (a) for 2D; for 3D, decide before M3,
   with a default that fits README §5's mobile memory ceilings: one fixed
   default, or one derived from `device.capabilities`, not a new option.
2. **UI canvases as cameras.** Screen-space UI is a separate camera.
   Options: (a) keep that, as an orthographic camera with `order` above the
   scene; (b) an overlay pass in the scene camera's view. Proposal: (a),
   which this design keeps working and which supports several canvases.

---

## 6. Design

### 6.1 A frame

```mermaid
flowchart TB
  subgraph postUpdate
    T[Transform propagation]
  end
  subgraph render stage
    H[Hierarchy visibility: changed visibility and parents only]
    E1[Extract cameras -> views]
    E2[Extract lights, meshes, deformation, sprites, text, debug shapes -> bins, phases, local bounds]
    G[GPU scene: slots, changed rows, texel 3, world spheres, change list]
    V[Cull every view: index lists, lit-view flags, lastVisibleFrame]
    B[Build frame graph from the renderer for every view]
    C[Compile: order, cull passes, pool, resolves]
    X[Execute passes, output passes in camera order]
  end
  T --> H --> E1 --> E2 --> G --> V --> B --> C --> X
```

`registerRendering(world, renderContext, renderer)` adds the hierarchy
visibility system (§6.8.5), ordered before every extraction system, the
extraction systems for the engine's renderables and the renderer system,
all in the `render` stage (design 03), adds the
`MeshChangeListEcsComponent` singleton that design 08's
`updateMeshComponent` appends to, and records the world's renderer on the
render context, which `renderContext.prepare` and design 11's early
compiles read (design 08 §6.10.2). Features add their own extraction
systems (lighting adds light extraction). A game's custom renderable gets
its own extraction system.

Every view is culled (§6.8) after the GPU scene's update and before the
frame graph is built, so per-frame passes' `setup` (design 09's shadow
maps) can read each view's culling results and lit-view flag.

### 6.2 Cameras

```ts
interface CameraEcsComponent {
  projection: PerspectiveProjection | OrthographicProjection;
  viewport: { x: number; y: number; width: number; height: number }; // fractions of the destination, default full
  renderTarget?: RenderTarget; // the destination; default: the canvas
  order: number; // composition order into the destination (was `layer`)
  clearColor: Color | null; // null: draw over what's already in the destination
  cullingMask: number; // matched against renderables' `category`, as today
  ySort: boolean; // 2D, unchanged
  msaaSamples: 1 | 4; // default 4
  renderScale: number; // the view's resolution as a fraction of its viewport's, in (0, 2]; default 1
}

interface PerspectiveProjection {
  kind: 'perspective';
  verticalFieldOfView: number; // radians, default π/3
  near: number; // default 0.1
  far: number; // default 1000
}

interface OrthographicProjection {
  kind: 'orthographic';
  scaling:
    | { kind: 'fixedHeight'; worldUnits: number } // today's verticalWorldUnits, default 10
    | {
        kind: 'referenceResolution';
        width: number;
        height: number;
        match: 'width' | 'height' | 'expand' | 'shrink';
      };
  zoom: number; // as today, default 1
  near: number; // default -1000
  far: number; // default 1000
}
```

- `createCamera(world, options)` keeps making a camera entity with a
  transform; its defaults make an orthographic camera that behaves like
  today's. The `projection` option says which kind of camera it is.
- The `referenceResolution` scaling mode computes the view's height from
  the destination's CSS size, the way UI canvases scale today, so the UI
  layout system no longer writes the camera (it was a second writer of
  `verticalWorldUnits`).
- `clearColor: null` replaces `RenderContext.clearStrategy`, which is
  removed (it was a second way to say "don't clear").
- `msaaSamples` is per camera because cameras genuinely differ: a
  pixel-art camera wants none.
- `renderScale` is per camera for the same reason: a 3D camera on a phone
  renders at 0.75 while its UI canvas camera stays at 1 (design 13 PP27).
  `createCamera` takes it as an option. A value outside `(0, 2]` throws
  when the view is set up.
- A camera's **effects** are components on the camera entity, as bloom,
  blur and tone mapping are today (design 13 adds the rest), so each
  camera chooses its own.

**Controllers** (`src/rendering/controllers/`), each a component and a
`postUpdate` system that writes its camera's `local` transform (and an
orthographic camera's `zoom`). A camera has at most one; adding a second
throws. Controller systems run in `postUpdate` after
`transformPropagationGroup`, so a followed target's `world` is current,
and call `propagateTransform` for their camera (design 04 §6.6, X8) so the
view reads this frame's camera transform.

A controller's inputs are input actions the game binds: `Axis2dAction`
for look and rotate, `Axis1dAction` for dolly and zoom, `Axis2dAction`
for move. The demo binds them to `MouseMotionBinding` (mouse movement
with `y` up, added in Phase 1 with `MouseInputSource.delta` removed; see
design 15 GP25) and the wheel. Damping needs state carried between
frames, so each controller component also has output-only fields its
system writes: the current yaw, pitch and distance (orbit) or yaw and
pitch (fly), and the smoothed velocities. Damping is exponential in
`deltaTimeInSeconds`, so the same motion gives the same result at any
frame rate.

| Controller                            | Behavior                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `PanZoomCameraControllerEcsComponent` | Today's `zoomInput`, `panInput`, sensitivities and zoom limits, moved off the camera, unchanged   |
| `OrbitCameraControllerEcsComponent`   | Orbits a target point or entity; rotate, pan and dolly inputs; distance and pitch limits; damping |
| `FlyCameraControllerEcsComponent`     | Free flight: look and move inputs, speed, boost, damping                                          |

### 6.3 Views

`computeCameraView(camera, transform, renderContext)` (and
`getCameraView(world, cameraEntity)`) return:

| Member                                                                 | Notes                                                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `viewMatrix`, `projectionMatrix`, `viewProjectionMatrix`, and inverses | 64-bit. The projection uses reversed depth when `EXT_clip_control` is present      |
| `position`, `forward`                                                  | World space                                                                        |
| `frustum`                                                              | Design 02 `Frustum`, built with the device's depth range                           |
| `worldToViewport(out, point)`                                          | CSS pixels from the canvas's top-left, Y-down, plus `depth` in `[0, 1]`            |
| `viewportToRay(out, point)`                                            | A world-space `Ray` for picking (design 15)                                        |
| `viewportToWorld(out, point, plane?)`                                  | Where the ray meets `plane` (default `z = 0`); exact for orthographic, the 2D case |
| `bounds`, `size`, `pixelsPerUnit`                                      | Orthographic only, as today: the 2D UI and culling code keep using them            |

Conversions use the camera's `viewport` rectangle of its destination, so
split-screen and minimap cameras convert correctly.

### 6.4 The renderer

#### 6.4.1 Features, passes and insertion points

```ts
const renderer = createRenderer(renderContext, {
  features: [lighting(), bloom()],
});

renderer.addPass('afterOpaque', outlinePass);
renderer.addPass('postProcessing', heatHazePass, { before: 'bloom' });
renderer.removePass('sky');
```

A **feature** is a function that adds passes, extraction systems and
shader includes to the renderer. A feature being in the renderer makes
its passes available; whether one runs for a camera is decided per view
(a bloom pass runs for views whose camera has a `BloomEcsComponent`).

Every renderer, with or without features, has the passes that draw the
engine's own phases: the depth prepass (`beforeOpaque`, decision R13),
the passes for the `opaque` and `alphaTested` phases (`opaque`), the
transparent pass (`transparent`), debug drawing (`afterTransparent` and
`overlay`, §6.9) and the output pass (`output`). Each one's `setup`
returns `null` when the view has nothing for it (its phases are empty, or
nothing was debug-drawn). So a view with only sprites, text and terrain
runs the transparent and output passes and has no depth attachment
(§6.4.2, design 07 S15), and unlit meshes draw with no feature at all, in
an orthographic 2D view (design 07 §6.7) or in design 08's Phase 1 cube
demo. Features add the other engine passes in the table below.
`lighting()` adds those of designs 09 and 10, plus ambient occlusion and
auto exposure (design 13), and `bloom()` and `gaussianBlur()` add theirs.
Tone mapping, color grading and FXAA are stages of the output pass
(design 13 PP2).

`addPass(point, pass, order?)` appends at the insertion point; the optional
`{ before?: string; after?: string }` names another pass at the same point
to run before or after, and naming a pass that isn't there throws. The
order of `features` never changes the order of passes.

**Camera extraction** turns each camera into a view. Besides the camera
and its transform, it declares one secondary query per engine camera
component that needs a feature: design 10's `ExposureEcsComponent`,
`EnvironmentEcsComponent`, `SkyEcsComponent`, `FogEcsComponent` and
`MaterialDebugViewEcsComponent`, design 09's `LightingDebugViewEcsComponent`
(all need `lighting()`), and design 13's effect components (bloom, blur,
ambient occlusion, auto exposure). When one matches a camera whose
renderer lacks the feature, setting up the view throws, naming the
component and the feature (design 13 §6.2.2). The same queries, with the
camera's projection, decide whether the camera is a lit camera (design 09
§6.2.2), which fixes its view's color format (§6.4.2) and whether it
reserves cascade layers. The queries import only component keys, so the
check adds nothing to a 2D bundle.

| Insertion point    | Engine passes there                                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frame`            | Shadow maps: the cascades of every lit view and the shared local light tiles, in one depth array (design 09); environment preparation (design 10); shared by all views                 |
| `beforeOpaque`     | Depth prepass (decision R13); per-lit-view light setup: light data and clusters (09); ambient occlusion (13)                                                                           |
| `opaque`           | Retained bins by (pipeline variant, material, mesh part), plus per-view instanced items from instance streams (design 15's mesh particles), pushed each frame and drawn after the bins |
| `afterOpaque`      | Sky, the scene-color copy and the transmissive phase (design 10)                                                                                                                       |
| `transparent`      | The transparent phase, including 2D sprites and text (07)                                                                                                                              |
| `afterTransparent` | Debug drawing (depth-tested)                                                                                                                                                           |
| `postProcessing`   | Bloom, blur and game effects, in design 13's fixed engine order (§6.3.3 there); tone mapping, color grading and anti-aliasing run in the output pass                                   |
| `output`           | Writing the result to the camera's destination                                                                                                                                         |
| `overlay`          | Debug drawing on top                                                                                                                                                                   |

A pass is:

```ts
interface RenderPassNode<TData> {
  name: string;
  /** Declares what the pass reads and writes for this view (or the frame). Returns null to skip. */
  setup(graph: FrameGraphBuilder, view: ViewResources): TData | null;
  /** Records draws. Runs only if the graph kept the pass. */
  execute(context: PassContext, data: TData): void;
}
```

`ViewResources` includes the camera's entity and components, so `setup`
reads its effect settings and returns `null` when the camera doesn't use
the pass. `PassContext` gives the device's pass encoder (design 05), the
view's bind groups, `drawPhase(phase)`, `drawFullscreen(material)` and the
textures the pass declared.

`FrameGraphBuilder` declares reads, writes and transient textures, and has
two members for passes that replace the view's color (design 13 §6.3):
`beginPostProcess(view)` returns the view's color so far as a source and a
new texture that becomes the view's color for every later pass, after
adding pending layers; `addPendingLayer(view, texture, intensity)` queues
light to add to the view's color, in the output pass or before the next
`beginPostProcess`, whichever comes first.

#### 6.4.2 View resources

Every view starts with resources passes can read and write:

- `color`: `rgba16float` when the camera is a **lit camera** or has
  bloom, tone mapping or auto exposure (design 13 §6.2.3); otherwise
  `rgba8unorm-srgb`. A lit camera is one whose renderer has `lighting()`
  and which has a perspective projection or a camera component that needs
  `lighting()` (§6.4.1; design 09 §6.2.2, decision L17). These inputs are
  the camera's own components and its renderer's features. A view's
  format therefore changes only when the game changes them, never because
  of what passed culling this frame, and `prepare()` compiles one target
  variant per camera. A UI canvas camera (orthographic, with no lighting
  component) in a renderer with `lighting()` isn't a lit camera and stays
  8-bit. An HDR view on a device without float color buffers throws
  (README P4, design 05 D11). Until design 07 Phase 2, non-HDR views are
  `rgba8unorm` and the output pass copies them without encoding; design 07
  Phase 2 switches them to `rgba8unorm-srgb` with encoding, outright, with
  no option to keep the copy.
- `depth`: `depth24plus`, or `depth32float` with reversed depth, only when
  the prepass or the opaque or alpha-tested passes run (design 07 S15). A
  pure 2D view has no depth attachment.
- **The depth attachment is latched.** Every item's color variant is
  keyed by the view's target, depth attachment included (design 08
  §6.5.1). A depth attachment that came and went from frame to frame
  would send every sprite, text and mesh in the view to a new pipeline
  and skip it while that compiles: a blank frame when the first opaque
  item enters a 2D view. So once a view has had a depth attachment, it
  keeps it until its camera's renderer, projection or effect components
  change. The latch is per camera, kept with the world's GPU scene
  (§6.7.1) and freed from camera extraction's `removed` journal, since
  it's derived render state no game reads.
- `normals`, written by the prepass when a pass asks for them (ambient
  occlusion).
- In a multisampled view whose alpha-tested phase has items, the prepass
  has a color attachment at location 0, which alpha-to-coverage needs
  (design 13 PP22): the normals when ambient occlusion is on, otherwise a
  transient multisampled `rgba8unorm` texture, never resolved and
  discarded at the end of the pass.

View textures are the viewport's size in device pixels times the camera's
`renderScale`, at least 1 texel on each axis. Projection, culling and
level of detail use the viewport's aspect and CSS size, which don't
change with the scale. Passes declare new transient textures
(`graph.createTexture(descriptor)`), sized relative to the view.

#### 6.4.3 Output and composition

The `output` pass reads the view's final color and writes the camera's
destination inside its viewport:

- It encodes linear color to sRGB in the shader (the canvas can't portably
  be an sRGB target: `drawingBufferStorage` with `SRGB8_ALPHA8` isn't
  available in every browser). The view holds premultiplied color, and bloom
  adds light where alpha is 0, so the pass splits each pixel into the light
  its coverage explains and the glow beyond it, encodes them separately and
  adds them (design 13 §6.5.3), so the premultiplied-destination contract
  holds and glow over a transparent camera only adds light.
- When a destination is a `rgba8unorm-srgb` render target, the pass adds
  the two parts in linear light and the hardware encodes the sum, so
  sampling the target, or blending into it, sees linear premultiplied
  color (design 13 §6.5.3). A float destination receives linear light,
  unencoded (design 13 §6.5.2).
- It reads the view's color at each destination pixel: with `texelFetch`
  at a render scale of 1, bilinear filtering otherwise (design 13 §6.4.4),
  so a scaled view is resampled into the destination viewport in the same
  pass.
- Until design 07 Phase 2, it copies `rgba8unorm` views without encoding
  (task 2.3).
- The first camera (lowest `order`) to write a destination in a frame
  replaces it, clearing outside its viewport if it has a `clearColor`;
  later cameras blend over it with the premultiplied blend state. A UI
  camera over a 3D camera composites as today's present system does.
- Tone mapping, color grading and FXAA (design 13) run inside the output
  pass when the camera has them, so a typical 3D camera has exactly one
  full-screen pass after its scene passes.

A camera's `renderTarget` is now its final destination, not an
intermediate that something else presents. Code that rendered into a
target only so the present system would show it simply drops the target
(Phase 2, task 2.4).

### 6.5 The frame graph

Each frame:

1. **Build**: every per-frame pass's `setup`, then for each camera in
   `order`, every per-view pass's `setup`. Each declares reads, writes and
   new transient textures. Imported resources are the canvas, camera
   render targets and long-lived textures (shadow cascades and atlas,
   environment maps).
2. **Compile**:
   - order passes by insertion point and registration order, checking
     every read has an earlier write;
   - drop passes whose writes are never read and don't write an imported
     resource;
   - compute each transient texture's first and last use and assign it a
     pooled texture with the same descriptor that's free for that span;
   - add an MSAA resolve before every pass that samples a multisampled
     texture written since its last resolve, not only before the first
     read: design 10's transmission copy resolves the color mid-frame, the
     transparent phase draws into it again, and post-processing resolves
     it a second time;
   - choose `loadOp`/`storeOp` per attachment (`discard` after the last
     use, `clear` on the first write when the pass asks for one).
3. **Execute** passes in order.

The compiled result is cached on the render context by a hash of the
passes and descriptors, so a frame like the previous one compiles in
constant time and allocates nothing. Pooled textures unused for a few
frames are released.

### 6.6 Phases, bins and batching

#### 6.6.1 Draw items and phases

| Phase          | Organization                                                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `opaque`       | Retained bins by (pipeline variant, material, mesh part)                                                                                                                                                                                                                                   |
| `alphaTested`  | The same                                                                                                                                                                                                                                                                                   |
| `shadowCaster` | The same bins, one set per world shared by every shadow view; each shadow view has its own culled set and index-list range (design 09); plus per-view instanced items from instance streams (design 15's mesh particles), pushed each frame and drawn after the bins                       |
| `transmissive` | Sorted per view, far to near; registered by `lighting()` (design 10 §6.12)                                                                                                                                                                                                                 |
| `transparent`  | Sorted per view with design 07 §6.3's keys: layer, world order, depth (far first, measured at the item's depth point: the bounds' center, or the nearest ancestor with `DrawOrderEcsComponent.depthGroup`), root Y for `ySort` cameras, root sequence, hierarchy index with a kind sub-key |
| `overlay`      | Submission order                                                                                                                                                                                                                                                                           |

The pipeline variant in a bin key includes the front-face winding, so a
mirrored object (negative scale determinant, a GPU scene flag) lands in a
bin whose pipeline flips `frontFace` (design 05 §6.5). A game can register
its own phase, binned or sorted.

#### 6.6.2 Bins

A bin holds the GPU scene slots whose part uses its key. Bins are retained
across frames: the mesh extraction system adds and removes slots from its
journals (design 03), and moves a slot between bins when
`updateMeshComponent` changes its mesh, materials or `castsShadows`
(design 08's change list, §6.2 there) or when a material's `featureKey`
changes (work per bin, not per slot). Meshes are immutable, so a mesh
never changes under a bin. A frame in which nothing was added, removed or
rebound does no bin work.

Per view, after culling (§6.8), each bin's visible slots are written into
the view's object index list, and the bin draws as one instanced draw.
Bins draw in key order, which groups pipelines and materials and minimizes
state changes.

#### 6.6.3 Object index lists and draws

Each view has an object index list: an `r32uint` data texture holding the
GPU scene slot of every instance it draws, bin after bin, written each
frame. A draw's first index in the list goes in a small per-draw table in
the `ForgeDraw` block (bind group 3). The vertex shader reads its slot as

```glsl
uint slot = texelFetch(forge_objectIndices, forge_listCoord(forge_drawOffsets[FORGE_DRAW_ID] + uint(gl_InstanceID)), 0).r;
```

GLSL ES 3.00 has no `gl_DrawID`; it exists only after
`#extension GL_ANGLE_multi_draw : require`, which `WEBGL_multi_draw` makes
available. The device injects a prelude: with the extension enabled,
that directive and `#define FORGE_DRAW_ID int(gl_DrawID)`; without it,
`#define FORGE_DRAW_ID 0`. Shaders use only `FORGE_DRAW_ID`.

The `ForgeDraw` block declares `uint forge_drawOffsets[1024]`. std140
gives each entry 16 bytes, so the block is 16 KB, the size WebGL2
guarantees for `MAX_UNIFORM_BLOCK_SIZE`. Each draw call gets its own range
of this table. The range is allocated in the device's per-frame staging
(design 05 §6.3) at an offset that is a multiple of
`UNIFORM_BUFFER_OFFSET_ALIGNMENT` (often 256 bytes), and the call binds
the block at that offset with `bindBufferRange`. A range never starts at
an arbitrary 16-byte entry, which `bindBufferRange` would reject. A plain
instanced draw writes one entry and reads it as entry 0, since
`FORGE_DRAW_ID` is 0. With `WEBGL_multi_draw`, consecutive batches with
the same pipeline and material whose meshes share a buffer (design 08's
pool) go into one call, up to 1,024 of them (a longer run splits into
several calls). Their entries follow one another in the call's range, and
`FORGE_DRAW_ID` selects each one's entry. WebGL2 rejects a draw whose
bound range is smaller than the block, so every bind covers the full
16 KB, overlapping the ranges after it, and the table's buffer extends
16 KB past the start of its last range. One shader source and one table
layout serve both paths; without multi-draw, every range holds one entry.

### 6.7 The GPU scene

#### 6.7.1 Slots

The render context keeps one GPU scene per world it renders, so two worlds
sharing a render context never collide. Each entity with a mesh component
gets a slot when the mesh extraction system sees it in its declared query's
`added` journal, and gives it up from `removed`. Slots are dense and
reused; the map from entity to slot is an `Int32Array` indexed by the
entity's slot index and checked against its generation. This is a derived
cache (README §4.4).

The renderer system's `cleanup(world)` (design 03's hook, run when the
system is removed or the world stops) disposes the world's GPU scene and
every per-world state other designs keep with it: design 09's lighting
state and shadow map array, design 12's animation data texture and
ranges, design 13's curve tables and readback slots, and design 07's
draw-order arrays. A game that creates and discards worlds (level
transitions, tests, editors) gets the memory back without waiting for the
context to die.

#### 6.7.2 Object data

An `rgba32float` texture, five texels per object:

| Texel | Contents                                                                                                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Row 0 of the 3x3 rotation-and-scale, and the high part of translation x                                                                                                                      |
| 1     | Row 1, high part of translation y                                                                                                                                                            |
| 2     | Row 2, high part of translation z                                                                                                                                                            |
| 3     | Low parts of translation x, y, z; `receivesShadows + 2 × mirrored + 4 × record`, where `record` is design 12's deformation record index (below 2²², 0 when not deformed), exact in `float32` |
| 4     | Per-object tint (design 08, decision MS6)                                                                                                                                                    |

Texel 3's fourth value replaces a skinned flag, which would duplicate the
variant's own skinning bits (design 12 AN31), so the object data stays at
five texels. The GPU scene writes it from inputs that each have one
owner: mesh extraction supplies `receivesShadows`; design 12's
deformation extraction supplies the record index, and a skinned slot's
mirrored flag (set when its first joint's `jointWorld × inverseBind`
mirrors, the transform its vertices end up with, design 12 §6.10.2); the
slot's transform supplies the mirrored flag of every other slot. The flag
selects the winding bin (§6.6.1) and the tangent sign (design 10 PB38).

The normal matrix is computed in the shader from the 3x3's cofactors
(correct for non-uniform scale). The matrix of cofactors is
`det(M) · M^-T`, so for a mirrored object (negative determinant) it points
normals inward; `forge_objectNormalToWorld` multiplies by `-1` when the
3x3's own determinant (row 0 dotted with its cofactor row) is negative,
before normalizing, which makes it `|det(M)| · M^-T`, the inverse
transpose up to a positive scale. It doesn't read the mirrored flag,
because for a skinned slot the flag describes the joints' transform while
these cofactors are those of the mesh entity's 3x3 (design 12 §6.10.2).

**The update.** The GPU scene's update runs after the extraction systems.
Each frame it compares each **dynamic** slot's transform `changedTick`
(design 04) with the stamp it last uploaded (for inequality, design 03
§6.3); **static** slots are written only when the static memberships'
journals report them or one of their ancestors. Design 04 recomposes a
reported static entity's whole subtree (its §6.3.2), so the GPU scene walks
the reported entity's subtree with `world.getChildren`, stopping at
transformless entities. It rewrites the row and world sphere of each static
slot in that subtree whose transform `changedTick` differs from the stamp
it last uploaded. Static slots are never scanned otherwise. Changed rows go
into a CPU-side `Float32Array` mirror, and contiguous dirty ranges upload
with `texSubImage2D`.

**World culling spheres** have one writer, this update. It builds each
from the slot's local bound: the mesh's own bound, or for a deformed slot
the mesh-space bound design 12's extraction supplies, and recomputes it
when the slot's transform or its local bound changed.

**Which slots are static.** A slot takes the static path (never scanned,
culled through the static tree, §6.8.3) only when its entity has
`staticTransformTag`, no ancestor up to the root or the first
transformless ancestor has a dynamic transform, and it has no deformation
record. Everything else is dynamic:

- A static entity under a moving dynamic ancestor is recomposed by design
  04's walk whenever the ancestor moves (its §6.3.2), so its row and
  sphere must follow; the dynamic path compares its stamp like any other.
  The GPU scene checks the chain when a slot is added, and for every slot
  in a reported entity's subtree when a static journal reports the entity
  (reparented or lost its parent). The mesh extraction system also
  declares dynamic transforms (`[transformId]` without
  `staticTransformTag`) and hands their journals to the GPU scene, which
  re-checks the slots in the subtree of an entity that became dynamic or
  static. Both are structural changes, so a still scene does no work.
- A slot with a deformation record changes its local bound while its
  transform may not move (design 12 §6.10.5), whatever its tags.

**The change list** is the GPU scene's per-frame record of what changed,
written by this update and read by design 09's shadow cache (its §6.5.6).
Each entry is a slot with its previous and new world sphere (a removed
slot with its last sphere):

- slots whose transform row changed;
- slots added and removed;
- slots moved between bins, or whose `castsShadows` changed (design 08
  §6.2.2);
- slots whose hidden-in-hierarchy flag changed (§6.8.5), with the same
  sphere as previous and new, so a cached shadow tile drops or regains the
  caster;
- slots whose alpha-tested shadow material's `version` changed;
- slots whose deformation tick advanced (design 12 §6.14 stamps it when a
  palette or morph list changes, since a character can deform in place
  without its transform changing);
- slots whose shadow variant became ready this frame (design 08 §6.10.1),
  as added, so a cached tile picks up a caster that was skipped while
  compiling.

It's cleared at the start of each update, and its arrays are reused.

#### 6.7.3 Camera-relative positions

The view block holds the camera position as high and low parts, a view
matrix with no translation (`forge_viewRotation`) and
`forge_relativeViewProjection`, the projection times that rotation, which
takes a camera-relative position to clip space. Engine shader functions,
which every material uses (design 08), compute:

```glsl
vec3 forge_objectToView(vec3 localPosition) {
  vec3 rotatedScaled = forge_objectBasis * localPosition;
  vec3 offset = (forge_objectTranslationHigh - forge_cameraPositionHigh)
              + (forge_objectTranslationLow - forge_cameraPositionLow);
  return mat3(forge_viewRotation) * (rotatedScaled + offset);
}
```

Subtracting the high parts first is exact for nearby values, so precision
near the camera is limited by the low parts, not by the distance from the
origin.

### 6.8 Visibility

#### 6.8.1 Per view

Every view is culled after the GPU scene's update and before the frame
graph is built (§6.1). For each view, a loop over the GPU scene's dynamic
sphere arrays (`Float64Array` centers, `Float32Array` radii) tests the
frustum's six planes and the object's `category` against the camera's
`cullingMask`, and marks visible slots. The loop skips slots hidden in the
hierarchy (§6.8.5).

While it writes the view's object index lists, the loop records whether a
visible opaque, alpha-tested or transparent item uses a lit material. For
a lit camera, that flag makes its view **lit** this frame (design 09
§6.2.2). It decides only whether the lighting feature does work for the
view: light data, clusters and rendering its cascades. It never changes
the view's color format (§6.4.2) or the cascade layers its camera
reserves (design 09 §6.5.1), which come from the camera. In the view of a
camera that isn't a lit camera, a visible lit item throws. The error
names the camera, the entity and the fixes: give the camera a perspective
projection or an `ExposureEcsComponent`, or leave the entity's `category`
out of the camera's `cullingMask`.

**Visibility feedback.** After culling, the renderer system writes
`MeshEcsComponent.lastVisibleFrame = time.frames` for every mesh visible
in a camera view or a shadow view, and for every dynamic caster a kept
cached shadow tile drew at its last render (design 09 §6.5.6). It is the
field's only writer, an output like `transform.world`; design 12 skips
sampling and palettes for meshes nobody saw (its AN26). Culling results
count whether or not a draw was skipped for a compiling pipeline.

#### 6.8.2 Per light

Shadow views (design 09) use the same loop with the light's frustum and a
`castsShadows` flag.

#### 6.8.3 Static tree

Slots on the static path (§6.7.2: `staticTransformTag`, no dynamic
ancestor, no deformation record) go into a bounding-volume tree, rebuilt
when the static set changes or a static slot's sphere moves (both rare,
§6.7.2). The per-view loop walks it, skipping whole subtrees outside the
frustum.

#### 6.8.4 Level of detail

A mesh component can list alternative meshes with the screen height (as a
fraction of the viewport) below which each is used. The extraction system
picks one per view from the sphere's projected size, with a hysteresis
band so objects at the boundary don't flicker.

- A slot is a member of the bins of every level. Per view, only the
  chosen level's bin writes the slot into the view's object index list.
- The hysteresis band needs the level chosen last frame. It's kept per
  (camera entity, slot) as a byte array in the world's GPU scene, and a
  camera's array is freed from camera extraction's `removed` journal.
- Shadow views draw the level chosen by the lit view their cascade
  belongs to, so a caster's shadow matches its mesh. Local light tiles,
  shared by every view, draw the highest-detail level any lit view chose.

#### 6.8.5 Hidden subtrees

`VisibilityEcsComponent.visible: false` hides an entity and every
descendant. Design 07's draw-order system resolves this for sprites, text,
terrain and masks during the walk it makes every frame for draw order.
Meshes and lights have no such walk. Walking B1's 50,000 static meshes
every frame would cost what §6.10 budgets as zero, so one system resolves
them from changes only (decision R17).

`registerRendering` adds `createHierarchyVisibilityEcsSystem(renderContext)`
to the `render` stage, before every extraction system. It declares
`[visibilityId]` and `[parentId]`. It keeps one byte per entity index in
the world's state beside the GPU scene (§6.7.1, freed with it by the
renderer system's `cleanup`): the entity's own `visible` as last read, and
whether it is hidden in the hierarchy. These flags are derived render
state, and the system is their only writer. Each run, it:

1. Clears the bytes of the entities in either `removed` journal that are
   no longer alive, processed before `added`, so a reused entity index
   never starts hidden. An entity in a `removed` journal that is still
   alive (it lost its component or its parent) keeps its byte and counts
   as changed.
2. Counts as changed the entities in either `added` journal (a component
   added or replaced, a new parent) and the members of `[visibilityId]`
   whose `visible` differs from the value last read. Reading `visible` is
   design 03 E3's comparison for an input nobody stamps, and costs one
   comparison per entity with the component.
3. Walks each changed entity's subtree once, outermost first, through
   `world.getChildren` and including transformless entities. It starts
   from the parent's flag and sets each entity's flag to
   `parentHidden || visible === false`, the rule `isVisibleInHierarchy`
   uses.
4. Lists every entity whose hidden flag differs from its value at the
   start of the run (step 3 reads the old flag before writing the new
   one), in a scratch list it fully rewrites each run. An entity that
   loses its own hidden `VisibilityEcsComponent` therefore goes from
   hidden to shown and is listed.

The flags' readers:

- The GPU scene update (§6.7.2) reads that list. It sets the per-slot
  hidden flag of each flipped entity that has a slot, and adds the slot to
  the change list. A new slot takes its entity's flag when it's allocated.
- Camera views (§6.8.1), shadow views (§6.8.2) and design 15's picking
  bounds query skip hidden slots. Hidden slots stay in their bins, so
  hiding and showing does no bin work. A hidden slot is never visible, so
  `lastVisibleFrame` isn't written for it.
- Light extraction reads the flag of each light (design 09 §6.2.1).

A frame with no change to a visibility value, a visibility component or a
parent does one comparison per `VisibilityEcsComponent` and walks nothing.

### 6.9 Debug drawing

```ts
const debug = world.getSingleton(debugDrawId);
debug.line(from, to, Color.red);
debug.box(boundingBox, Color.green, { depthTest: false });
debug.sphere(center, radius, color);
debug.arrow(origin, direction, color);
debug.frustum(view, color);
debug.grid({ size: 20, divisions: 20 });
```

Shapes are appended to typed arrays in the singleton component (state in
a component, README §4.4), drawn as lines in `afterTransparent`
(depth-tested) and `overlay` (on top). Both shape buffers are per-frame
message streams (design 03 §6.5): any system appends, none edits or
removes another's shapes, one owner clears each, and the debug pass reads
them after the writers. The frame buffer is cleared in the `last` stage.
Shapes drawn from the fixed stages (physics debug, design 14) go into a
second buffer that's cleared at the start of the next fixed step instead,
so they don't flicker on frames without one.
Physics, skeletons (design 12), light volumes (design 09) and bounds draw
through it.

The **stats overlay** (`createRenderStatsOverlay(container, renderContext)`)
is a DOM element updated twice a second from the device counters (design
05), so it costs nothing on the GPU.

### 6.10 Performance

Budgets for B1 (50,000 static meshes, 200 unique meshes, 50 materials) on
the desktop reference, measured per stage by the design 01 runner:

| Work                               | Budget                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Transform propagation (all static) | ≈ 0 (static subtrees aren't visited, design 04)                                 |
| Hidden-subtree resolution          | ≈ 0 (no visibility or parent changes; only changed subtrees are walked, §6.8.5) |
| GPU scene updates                  | ≈ 0 (no dynamic slots; static slots not scanned)                                |
| Culling (static tree)              | ≤ 0.5 ms                                                                        |
| Bin traversal and index lists      | ≤ 1.0 ms                                                                        |
| Shadow views (design 09)           | ≤ 1.0 ms                                                                        |
| Pass execution, draw submission    | ≤ 1.0 ms                                                                        |
| **Total**                          | **≤ 4 ms**                                                                      |

No per-frame allocation (allocation specs for every extraction system and
the renderer system).

### 6.11 Testing

- Unit: view matrices and conversions for both projections, both depth
  conventions and both scaling modes; frame graph ordering, culling,
  pooling and resolve insertion (a resolve before each read that follows a
  write); `addPass` ordering and its unknown-name error; the
  missing-feature check; a renderer created with no features draws an unlit
  opaque item through the prepass and opaque passes, and a view with only
  transparent items runs neither and has no depth attachment; per-camera
  pass activation; view formats decided from the camera (perspective;
  orthographic with and without an `ExposureEcsComponent`; HDR effects) and
  unchanged while lit content enters and leaves the frustum; depth
  attachments decided from content; a lit item in the view of a camera that
  isn't lit throws; render-scale sizes; bin upkeep from journals, the
  change list and `featureKey`; index-list layout; `ForgeDraw` ranges that
  start at multiples of `UNIFORM_BUFFER_OFFSET_ALIGNMENT`, with each bind
  covering the whole block, with and without multi-draw (recording GL
  helper); slot allocation; dirty-range coalescing; texel 3 packing; world
  spheres from local bounds; static slots under a moving dynamic parent
  take the dynamic path; the change list's entries with previous and new
  spheres; `lastVisibleFrame` for camera views, shadow views and kept
  cached tiles; culling against brute force; hidden subtrees: hiding and
  showing an ancestor, reparenting into and out of a hidden subtree, adding
  and removing the component, a reused entity index never starting hidden,
  a frame with no change walking nothing, a flipped slot entering the
  change list, hidden slots skipped by camera views, shadow views and the
  picking bounds query, a light hidden through an ancestor; the depth
  latch; LOD hysteresis around a threshold, a removed camera's levels
  freed, a shadow view's level; a context restore uploads every slot row,
  static ones included (recording GL helper); creating, rendering and
  stopping 20 worlds returns the device's resource count and bytes to
  baseline.
- Controllers: pitch and distance clamps; the same motion at 20, 60 and
  240 fps gives the same pose within 1e-6; a second controller throws.
- e2e: camera composition (two cameras, UI over 3D), viewports
  (split-screen), the depth-precision analytic test on design 01's backend
  matrix and the reference devices, a custom pass, per-camera effects (one
  camera blurred, one bloomed, as in the space-shooter demo); dragging the
  real mouse on an orbit camera moves a landmark's on-screen position in
  the expected direction (relative measurement); an opaque mesh entering a
  2D orthographic view drops no sprite from any frame, and a lit mesh
  entering and leaving the view of an orthographic camera with an
  `ExposureEcsComponent` drops no sprite and reallocates no target
  (measured from a sprite landmark's bounds across frames and the device's
  resource count); the test renderable (task 3.6) with `WEBGL_multi_draw`
  masked by design 01 §6.4.4's `getExtension` init script draws the same
  image as without the mask, on design 01's backend matrix; the
  `webgl-context-loss` GPU scene case (§6.12).
- Golden: debug shapes from a perspective camera; orthographic and
  perspective views of the same scene; mirrored meshes; one mesh with
  three levels at three distances.
- Benchmarks: B1 and B2 stage timings; culling and bin microbenchmarks.

### 6.12 Context loss

Design 05 §6.10 rebuilds every GPU resource from its restore source. For
the renderer:

1. The object data texture's `Float32Array` mirror (§6.7.2) is the
   texture's `restoreSource` (design 05 §6.10, CPU mirrors), so a restore
   re-uploads every row, static ones included. Without it, static rows,
   uploaded once and stamped current, would never be rewritten and would
   come back empty.
2. The frame graph's compiled-plan cache and transient pool (§6.5) are
   dropped on `onContextRestored`; the next frame compiles and allocates
   them again.
3. Object index lists, the mask table and staging are written every frame
   and refill by themselves.

`webgl-context-loss` gains a scene with 1,000 static and 100 dynamic items
of task 3.6's test renderable: it loses and restores the context and
compares a static landmark's rendered bounds before and after (a relative
measurement). Meshes arrive in M3, and design 08 §6.11's context-loss
scene adds a static mesh.

### 6.13 Documentation

- `rendering/world-units-and-cameras.md` (Phase 1): rewritten for
  projections, scaling modes, viewports, `order` and controllers.
- `rendering/cameras-3d.md` (Phase 1): perspective cameras, orbit and fly
  controllers, binding their inputs.
- `rendering/renderer.md` (Phase 2): the renderer, its features, passes,
  insertion points, the output pass and camera destinations.
- `rendering/multipass-rendering.md` (Phase 2): rewritten for cameras
  that render into their own targets and composite in `order`.
- `rendering/custom-passes.md` (Phase 3): a custom phase, extraction
  system and pass.
- `rendering/debug-drawing.md` (Phase 5): shapes, the fixed-step buffer
  and the stats overlay.

---

## 7. Review

`solution-reviewer` verdict on the first draft (reviewed with design 05):
**REVISE**. The frame graph, extraction systems and GPU scene matched
Frostbite's, Unity's and Bevy's approaches; several specifics were wrong.
Changes made:

- Every camera renders through an intermediate target and an output pass
  (R8). The first draft let effect-free cameras draw straight into the
  canvas, which would blend in gamma space and can't resolve sRGB MSAA.
- Effects stay camera components that per-view passes read (R12); the
  first draft's renderer-wide features couldn't express today's
  per-camera bloom and blur. View formats and the prepass (R13) are now
  decided from data.
- Opaque, alpha-tested and shadow phases are retained bins (R14) instead
  of per-frame sorts, and the GPU scene skips static slots, so a still
  scene does work proportional to change.
- Object indices come from a list read at a per-draw offset, one path with
  and without multi-draw; mirrored objects get a winding variant in the
  bin key.
- The GPU scene is kept per world.
- Camera ownership: the UI layout's write of `verticalWorldUnits` becomes a
  projection scaling mode, `clearStrategy` is removed in favor of
  `clearColor: null`, and one controller per camera is enforced.
- The far plane default is the same on every device (R15).
- Fixed-step debug shapes no longer flicker.
- The migration of camera render targets (UI canvases, a demo, four e2e
  scenes) is listed.
- "Aliasing" is described as pooled reuse, since WebGL2 can't alias
  memory.

Changes from designs 07 to 15, applied when the program was reconciled:
draw items and the sorted transparent phase moved into Phase 2 (task 2.6)
for design 07 Phase 1, with design 07's keys; 8-bit views copy until design
07 Phase 2; depth only where an opaque pass writes it; view formats decided
from the camera: lit cameras and HDR effects (designs 09, 13);
`renderScale`, `beginPostProcess`, pending layers, `addPass` ordering,
resolves before every read after a write and the split output encoding
(design 13); camera extraction's missing-feature check (designs 09, 10,
13); the transmissive phase and the `afterOpaque` passes (design 10);
culling of every view before the build, lit-view flags, shared
shadow-caster bins and the change list (design 09); texel 3's record index,
world spheres from local bounds, deformed slots on the dynamic path and
`lastVisibleFrame` (design 12); bins driven by design 08's change list;
debug buffers as message streams (design 15). The review of design 12 also
found that static slots under a moving dynamic parent were never rewritten;
such slots now take the dynamic path (§6.7.2).

A later review found that per-frame lit status changed view formats and
the shadow map array's layer count as a camera turned. Formats and cascade
reservations now come from the camera and its renderer's features (design
09 L17), and only the depth attachment is latched.

After the product owner's review: the pass graph is `Renderer`, created
with `createRenderer` (R16), so pipeline means GPU pipeline state only.
Every renderer has the depth prepass, the opaque and alpha-tested passes,
the transparent pass, debug drawing and the output pass, with or without
features, so unlit meshes draw in 2D views and in design 08's Phase 1
demo (§6.4.1).
