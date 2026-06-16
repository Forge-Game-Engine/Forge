---
name: project-ui-epic1
description: UI Epic 1 (Core & Layout Foundations) completed on 2026-06-16; all new code lives under src/ui/
metadata:
  type: project
---

Epic 1 of the Forge UI stack was fully implemented (F1.1–F1.6) on 2026-06-16.

**Why:** Establishes the foundational ECS-native UI layer that Epics 2–10 build on.

**Files added:**
- `src/ui/components/` — `ui-canvas-component.ts`, `ui-transform-component.ts`, `ui-flex-component.ts`, `index.ts`
- `src/ui/systems/` — `ui-layout-system.ts`, `ui-flex-layout-system.ts`, `index.ts`
- `src/ui/utilities/` — `anchor-presets.ts`, `set-ui-rect.ts`, `create-ui-canvas.ts`, `create-ui-resize-observer.ts`, `index.ts`
- `src/ui/shaders/index.ts` (placeholder for Epic 2)
- `src/ui/index.ts`
- Tests: `ui-layout-system.test.ts`, `create-ui-resize-observer.test.ts`

**Files updated:** `src/index.ts` (+ui export), `package.json` (+ `"./ui"` export path)

**How to apply:** Next epics (rendering, text, interaction) should import from `./ui/index.js` or the `./ui` package path.
