# Epic 10 — Documentation Site Demo & User Guides

A consolidated **UI showcase demo** in the documentation site covering every UI
feature, complete **user guides** for each feature and how to compose them, and a
verified-complete **API reference** (JSDoc coverage). This epic makes the stack
cohesive and discoverable; per-epic docs/demos already exist by now — this unifies
them.

## Status

- **Phase:** 5 — Animation, Performance & Documentation
- **Depends on:** all functional epics (1–9). Uses the Docusaurus
  [documentation-site](../../documentation-site/) and its demo, plus the existing
  `document-feature` workflow/skill for guide+JSDoc authoring.
- **Note:** consolidation, not deferral — each epic ships its own guide/demo/
  JSDoc as part of its definition of done.

## Architectural notes

- Guides live under `documentation-site/docs`; the API reference is **generated
  from JSDoc**, so completeness here means completeness of JSDoc on all public
  `src/ui` symbols. The site also hosts a runnable demo where each UI feature
  should appear.

---

## Features

### F10.1 — Consolidated UI showcase demo

**Goal:** one navigable demo covering every UI feature end to end.

**Implementation detail:**
- Build a showcase in the documentation-site demo with sections per area:
  layout/anchors/resize (Epic 1), styling & custom shaders & clipping (Epic 2),
  text & fonts (Epic 3), interaction/focus/keyboard (Epic 4), each primitive
  widget (Epic 5), composition utilities (Epic 6), scroll/input/dropdown
  (Epic 7), and animation presets (Epic 8).
- Include the Epic 9 stress scene (or a link to it) so the showcase also
  demonstrates scale.
- Make it interactive: live controls for theme, element count, and animation
  settings; every demo snippet should be copy-pasteable and reflect the real
  public API.

### F10.2 — User guides (per feature + composition)

**Goal:** a complete, navigable guide set.

**Implementation detail:**
- Ensure a guide exists and is cross-linked for: UI layout & anchors; default
  shader styling; custom materials; clipping/masking; text rendering & font-atlas
  generation; interaction & events; focus & keyboard navigation; defocus/blur
  behavior; each primitive widget; authoring composed widgets (Epic 6
  conventions); scroll groups; input boxes; dropdowns; animating UI; UI
  performance.
- Add an overarching **"UI overview / getting started"** page: the mental model
  (ECS-native, reuse rendering/input/events/animation), a minimal end-to-end
  example (create canvas → panel → button → handle click), and a feature map
  linking to the deep-dive guides.
- Use the `document-feature` skill so guides stay practical (use cases, gotchas,
  perf notes, code smells) rather than restating the API.

### F10.3 — API reference completeness (JSDoc audit)

**Goal:** the generated reference covers the entire public UI surface.

**Implementation detail:**
- Audit every exported symbol in `src/ui` (components, component ids, system
  factories, utilities, factories, types, shader loaders, theme types) for JSDoc
  with `@param`/`@returns`/`@throws` and documented event payloads.
- Verify the reference generates cleanly and that `src/ui` is fully exported from
  `src/ui/index.ts`, `src/index.ts`, and mapped in `package.json` (run
  `npm run check-exports`).
- Fix any gaps surfaced by the generator (undocumented exports, broken links).

### F10.4 — Verification & polish

**Goal:** the docs build is correct and the showcase actually runs.

**Implementation detail:**
- Build the documentation site and the demo; fix broken links, dead snippets,
  and stale screenshots. Verify each guide's example compiles against the
  shipped API (snippets should come from real, tested code where possible).
- Run the full project gate before sign-off: `npm run check-types`, `npm test`,
  `npm run lint`, `npm run cspell`, `npm run check-exports`.

---

## Cross-cutting (definition of done)

- The consolidated showcase demo covers every UI feature and runs in the docs
  site.
- A complete, cross-linked guide set incl. an overview/getting-started page.
- Generated API reference has full JSDoc coverage for `src/ui`; exports verified.
- Docs site + demo build green; full lint/type/test/spell/exports gate passes.
