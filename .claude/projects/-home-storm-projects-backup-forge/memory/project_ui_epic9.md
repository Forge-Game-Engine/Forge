---
name: project-ui-epic9
description: UI Epic 9 — Performance, Stress Testing & Hardening implemented on 2026-06-17; render metrics, clip culling, robustness tests, stress-test demo
metadata:
  type: project
---

UI Epic 9 (Performance, Stress Testing & Hardening) implemented on 2026-06-17.

**Why:** Epic 9 consolidates perf/robustness work — validate the full UI stack under load and lock in gains.
**How to apply:** Use `getUiRenderMetrics()` in any overlay/profiler needing batch/instance counts. Run `demo/ui-stress-test.html` for manual batch-count regression checks.

## What was added

### F9.2 — Clip culling + render metrics (`src/ui/systems/ui-render-system.ts`)
- Module-level `isFullyClipped(transform)` helper — skips entities whose `resolvedRect` is entirely outside their `clipRect` before packing into a batch. Eliminates hidden scroll-list rows from the draw call.
- `UiRenderMetrics { batchCount, instanceCount }` — snapshot of the previous frame
- `getUiRenderMetrics(): UiRenderMetrics` — reads the last-frame snapshot; updated at `beforeQuery` boundary
- Both exported via `src/ui/systems/index.ts` → `src/ui/index.ts` → `src/index.ts`

### F9.3/F9.4 — Performance & robustness tests (`src/ui/systems/ui-performance.test.ts`)
- `getUiRenderMetrics()` returns numeric struct (non-GL guard)
- Rapid focus changes: exactly one entity focused, `onFocus`/`onBlur` fire correct counts, no duplicate events on same-entity repeat
- Animation cleanup: finished animations spliced, 200 concurrent animations cleared in one frame, looping animations counted down correctly
- Teardown: `clear()` on all state events removes all listeners; `destroyUiSubtree` on 500-child tree removes all components; listener count never grows across repeated create/destroy cycles

### F9.1 — Stress-test demo
- `demo/ui-stress-test.html` — HTML entry point with DOM controls overlay + metrics overlay
- `demo/src/ui-stress-test.ts` — scene implementation
  - URL params: `?count=N` (default 200), `?animations=0–10` (default 3), `?clipping` (scroll group), `?customShader`
  - Grid of N panels with hue-cycled colors; layout uses `createUiPanel` + `panelRenderable` (single batch)
  - Animated panels: opacity pingpong or scale pingpong depending on index
  - Scroll group (when `?clipping`): 280×240 viewport, 100 list items × 28 px, content 2800 px — exercises clip culling
  - DOM overlay: FPS, frame ms, batches, instances, JS heap Δ KB/frame (uses `getUiRenderMetrics`)
  - HTML controls: element count, animation density slider, scroll-group checkbox → Apply reloads with new params

## Manual checks (GL-limited, cannot unit-test)
- Open `demo/ui-stress-test.html?count=500`: Batches should be 1–2 (all panels share one `Renderable`)
- Open with `?clipping`: Batches should not grow with scroll position (culled rows not packed)
- Compare before/after with `?animations=10` to measure per-frame allocation via heap Δ

## Critical bug found via the stress test: UI vertex shaders used the wrong matrix-multiply order
Symptom: stress test loaded, metrics showed correct batch/instance counts (e.g. 200 instances, 1 batch), but the canvas was 100% black — nothing visible.

Root cause: `ui.vert.glsl` and `text.vert.glsl` computed `vec3(coord,1.0) * worldMatrix` and `screenPos * u_projection` (vector-on-left / `v*M`). But every other part of the engine's `Matrix3x3` (the `translate()` method placing translation in the last column, `computeUiWorldMatrix`'s TRS chaining, and `point-in-ui-element.ts`'s explicit `screen = M * local` doc comment) is built for the standard `matrix * vector` convention (translation in the last column, matrix on the left). `v*M` is mathematically `transpose(M)*v`, which silently drops translation unless M is symmetric. Sprites use the identical `Matrix3x3`-built projection matrix but never hit this because camera position is always `(0,0)` in existing demos — translate-by-zero is a no-op, making the bug invisible. UI's projection always translates by `-width/2, -height/2` (nonzero), so it broke immediately.

**Why this matters:** `createUiProjectionMatrix`'s own unit test (`create-ui-projection-matrix.test.ts`) has a `vecMat()` helper mislabeled "as GLSL would" that actually implements `M*v`, not `v*M` — so the test suite passed while the real shader was wrong. Unit-testing matrix *values* in isolation can't catch a multiply-order mismatch against the shader; only an actual rendered pixel (or the stress-test screenshot) caught it.

Fix: changed both shaders to `worldMatrix * vec3(...)` and `u_projection * screenPos` (matrix-on-left). Did **not** touch `sprite.vert.glsl`, which has the same latent `v*M` bug on its projection multiply — currently dormant only because no demo uses a non-zero camera position. Worth fixing if a camera-pan feature is ever added.

**How to apply:** When adding new UI/render shaders that consume a `Matrix3x3`, always use `matrix * vector` order in GLSL to match the TS-side convention. Don't trust a matrix unit test alone for shader correctness — render an actual frame.

## Second bug found in the same pass: demo used wrong HSLA units
`Color.fromHSLA(h, s, l, a)` expects `h` in **0–360** and `s`/`l` in **0–100** (confirmed by `color.test.ts`). `demo/src/ui-stress-test.ts` was passing fractional `0–1` values for all three, which collapsed every panel to near-black/desaturated. Fixed by scaling `hue * 360` and using `55`/`70`/`45` etc. instead of `0.55`/`0.7`/`0.45` for saturation/lightness. This was independent of the matrix bug — both had to be fixed before panels were visible with correct color.

[[project-ui-epic8]]
[[project-ui-epic1]]
