# Epic 9 — Performance, Stress Testing & Hardening

A **stress-test demo** rendering hundreds of distinct UI elements at once, a
**profiling pass** with targeted optimizations, and a **robustness pass** over
the nasty edge cases (rapid focus changes, resize storms, tab-blur/refocus, many
simultaneous animations). This epic consolidates performance/robustness work that
is also done incrementally per-epic; it exists to validate the **whole** stack
under load.

## Status

- **Phase:** 5 — Animation, Performance & Documentation
- **Depends on:** all functional epics (1–8) being in place.
- **Note:** per the roadmap, this is consolidation, not deferral — batching,
  dirty-flagging, and culling hooks are designed into the earlier epics; here we
  measure and tighten them.

## Architectural notes

- The win/lose condition for UI performance is **batch count and per-frame
  allocation**. The render system groups by `Renderable` and reuses a growable
  `Float32Array` per `InstanceBatch`
  ([instance-batch.ts](../../src/rendering/systems/instance-batch.ts),
  [render-system.ts](../../src/rendering/systems/render-system.ts)). UI must
  preserve this: shared materials/atlases → few batches; per-frame work must
  avoid garbage (reuse scratch buffers, as the engine already does with module-
  level arrays).

---

## Features

### F9.1 — Stress-test demo (hundreds of distinct elements)

**Goal:** the roadmap's required large-scale scene to validate batching and frame
budget.

**Implementation detail:**

- A demo scene spawning hundreds–thousands of UI elements: mixed panels,
  buttons, text, checkboxes, sliders, a scroll group with a long list, and active
  animations. Provide on-screen controls for element count, animation density,
  and toggling features (clipping, custom shaders) to isolate costs.
- Surface live metrics: FPS/frame time, **draw-call/batch count**, instance
  count, JS heap delta/frame. A small debug overlay (itself UI) is fine.
- Make element count a URL/UI parameter so it doubles as a regression scene for
  CI-adjacent manual checks.

### F9.2 — Profiling pass & batching validation

**Goal:** confirm the design batches as intended and find the real hotspots.

**Implementation detail:**

- Profile with the F9.1 scene (Chrome performance + `gl` draw-call counting).
  Verify: same-material/same-atlas elements share one batch; z-index sorting
  isn't fragmenting batches more than necessary (Epic 2 coarse-z guidance);
  text of one font is one batch.
- Targeted optimizations, each measured before/after:
  - **Dirty-flag layout:** ensure static subtrees skip re-solve (Epic 1
    `isStatic`/dirty), like `PositionEcsComponent.isStatic`.
  - **Cull fully-clipped/offscreen instances** before packing (Epic 2/7) so
    scroll lists don't pay for hidden rows.
  - **Reuse scratch buffers**; eliminate per-frame allocations in hit-testing,
    layout, and instance packing (audit for `new`/array literals in hot loops).
  - **Cache shaped text**; never re-shape unchanged strings (Epic 3 `_dirty`).
  - Consider sorting stability so batches don't reshuffle every frame.

### F9.3 — Robustness / edge-case hardening

**Goal:** the UI survives hostile sequences without leaking, crashing, or
desyncing.

**Implementation detail:**

- **Rapid focus changes:** spam tab/click focus; assert exactly one focused
  element, no event storms beyond transitions, and in-flight focus animations
  cancel/replace cleanly (Epic 8).
- **Resize storms:** drag-resize continuously; assert layout re-solves are
  coalesced to one/frame (Epic 1), the mouse source's cached bounding rect is
  refreshed (Epic 4), and hover targets update correctly afterward.
- **Tab-blur/refocus:** switch tabs during press/drag/animation; assert the blur
  policy (Epic 4) clears transient state and that refocus restores a sane state
  (no stuck pressed/hover, animations resume or settle).
- **Many simultaneous animations:** hundreds of concurrent UI animations; assert
  no unbounded growth in `AnimationEcsComponent.animations` (finished ones are
  spliced — verify) and acceptable frame time.
- **Teardown leaks:** create/destroy thousands of widgets; assert
  `destroyUiSubtree` (Epic 6) removes all components and clears all
  `ParameterizedForgeEvent` listeners and observers (no growth in listener
  counts / no detached DOM nodes from input-box/blur/resize utilities).

### F9.4 — Performance budget & guardrails

**Goal:** lock in the gains so regressions are caught.

**Implementation detail:**

- Document a target budget (e.g. N elements at 60fps within X batches) based on
  F9.2 findings.
- Add lightweight automated guards where feasible: unit/integration tests
  asserting batch-count for a known scene, no per-frame allocation in a hot path
  (spy/counter), and animation-array cleanup. Note GL-limited assertions that
  must stay manual.

---

## Cross-cutting (definition of done)

- The stress-test demo (F9.1) committed and documented.
- A short "UI performance" guide capturing the batching model, the dirty/cull/
  cache optimizations, the measured budget, and gotchas (what fragments batches).
- Edge-case tests (F9.3) and any feasible perf guards (F9.4) in the suite.
- All optimizations preserve behavior (existing UI tests still green) and exports
  remain intact.
