---
name: project-ui-epic6
description: Epic 6 — Composition Utilities implemented on 2026-06-17; UiWidgetHandle, createUiElement, destroyUiSubtree, UiTheme
metadata:
  type: project
---

Epic 6 (Composition Utilities) implemented 2026-06-17 on branch `ui-layer`.

**New files:**

- `src/ui/utilities/ui-widget-handle.ts` — `UiWidgetHandle<TParts, TEvents>` interface (F6.1)
- `src/ui/utilities/create-ui-element.ts` — `createUiElement()`, `addUiChild()`, `setUiParent()` (F6.2)
- `src/ui/utilities/destroy-ui-subtree.ts` — `destroyUiSubtree()` recursive entity cleanup (F6.3)
- `src/ui/utilities/ui-theme.ts` — `UiTheme`, `defaultUiTheme`, `mergeUiStyle()`, `uiThemeToBaseStyle()` (F6.4)
- Corresponding `.test.ts` files for all new utilities

**Modified files:**

- `create-ui-panel.ts`, `create-ui-button.ts`, `create-ui-checkbox.ts`, `create-ui-slider.ts` — all retrofitted to include `parts`, `events`, and `destroy()` implementing `UiWidgetHandle`
- `src/ui/utilities/index.ts` — exports added for all new utilities

**Why:** Load-bearing conventions epic — establishes standard widget factory return shape and lifecycle utilities that Epic 7 advanced widgets must follow.

**How to apply:** When creating new widgets, return shape must extend `UiWidgetHandle`. Call `destroyUiSubtree` in `destroy()` and clear all `ParameterizedForgeEvent`s owned by the widget.

[[project_ui_epic1]]
