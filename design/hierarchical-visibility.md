# Design: Hiding an Entity Hides Its Subtree

|                                       |                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                            | Draft, for review                                                                                                                                                                                                                                                                                                                                                                          |
| **Kind**                              | Feature                                                                                                                                                                                                                                                                                                                                                                                    |
| **Found in**                          | Galactic Journey demo: `setShown` helpers in `src/game-over/create-stats-panel.ts`, `create-flight-history-page.ts`, `pilot-panel.system.ts`, `src/leaderboard/create-leaderboard-page.ts`, `src/main-menu/create-main-menu.ts`; the stats panel's button repositioned by hand when the one above it is hidden; `src/speed/create-hud.ts` (the speed HUD's ring hidden segment by segment) |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                                                                                                                                                                                                   |
| **Related**                           | the UI module (`/src/ui`, documented in `documentation-site/docs/docs/ui`), the world's hierarchy (`EcsWorld.setParent`/`getChildren`, landed), hierarchical draw order (`DrawOrderEcsComponent`, `createDrawOrderResolver` in `src/rendering/draw-order.ts`, landed)                                                                                                                      |

## 0. Targeted modules

| Path                                                                                                                | Change   | Notes                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `src/rendering/components/visibility-component.ts`                                                                  | **New**  | `VisibilityEcsComponent { visible }`; `isVisibleInHierarchy`                                               |
| `src/rendering/systems/render-system.ts`, `src/text/rendering/*`                                                    | Modified | Skip entities hidden in the hierarchy                                                                      |
| `src/ui/systems/ui-layout-group-system.ts`                                                                          | Modified | Hidden children take no space in layout groups and content size fitters                                    |
| `src/ui/systems/ui-raycast-system.ts`, `ui-navigation-system.ts`, `ui-interaction-system.ts`, `ui-slider-system.ts` | Modified | Hidden elements can't be hit or focused; focus is released and presses cancelled when an element is hidden |
| `src/ui/utilities/create-dropdown.ts`, `create-tooltip.ts`, `src/ui/systems/ui-tooltip-system.ts`                   | Modified | Their hand-written hiding becomes `visible`                                                                |
| `src/particles/systems/particle-emitter-system.ts`                                                                  | Modified | An emitter hidden in the hierarchy doesn't emit                                                            |
| `documentation-site/docs/docs/ui/`, `rendering/`                                                                    | Modified | Hiding vs. fading                                                                                          |

---

## 1. Summary

Forge can hide one sprite (`SpriteEcsComponent.enabled`) or one text
(`TextEcsComponent.enabled`), and can fade a UI subtree with a
`CanvasGroupEcsComponent` (`alpha`, `interactable`, `blocksRaycasts`). It
can't hide a subtree. The demo shows and hides pages, page sections and
buttons through a canvas group, with the same three-line helper in five
files:

```ts
const setShown = (group: CanvasGroupEcsComponent, isShown: boolean): void => {
  group.alpha = isShown ? 1 : 0;
  group.interactable = isShown;
  group.blocksRaycasts = isShown;
};
```

That's a fade to zero, not a hide:

- **Hidden elements still take up layout space.** When the end-of-run
  panel's history button is hidden, the main-menu button below it would
  leave a gap, so the demo moves it up by hand.
- **Hidden elements are still drawn**, at zero alpha, every frame.
- **Focus can stay on a hidden element.** Nothing moves focus off a
  button whose page was faded out.

Forge's own controls do the same by hand: the dropdown's `setOpen` writes
`interactable`, `blocksRaycasts`, `sprite.enabled` and `text.enabled` on
every option, and the tooltip system does the same for its panel.

The gap isn't only in UI. The speed HUD's ring is a set of world sprites
around the ship, and to hide it while the ship is destroyed,
`createHudAnchorEcsSystem` sets `sprite.enabled` on every one of its
segments, every frame.

Unity and Godot have one subtree switch that removes the subtree from
rendering, layout and input together; Bevy has inherited visibility for
rendering and a separate `Display::None` for layout. This design adds one
switch for any entity, world sprites as much as UI, and leaves canvas
groups for what they're for: fading and disabling interaction.

---

## 2. Scope

### In scope

- `VisibilityEcsComponent` on any entity, inherited by descendants.
- Rendering, UI layout groups and content size fitters, raycasts, focus
  navigation and particle emitters respecting it.
- Moving the dropdown's and tooltip's hand-written hiding onto it.

### Out of scope

- **Disabling a subtree's logic** (Unity's inactive GameObjects stop their
  scripts). Systems decide for themselves what a hidden entity means;
  pausing whole groups of systems is what run conditions and game states
  (`/src/states`) are for.
- **Hiding across canvases.** A canvas is a root, so a canvas shown along
  with a page on another canvas (the demo's title) is hidden with its own
  `visible`, one line instead of a group.

---

## 3. How established engines handle this

- **Unity**: `GameObject.SetActive(false)` takes the subtree out of
  rendering, raycasts and layout (layout groups skip inactive children).
  `CanvasGroup.alpha` is for fading and doesn't affect layout.
- **Godot**: `CanvasItem.visible = false` hides the subtree; containers
  skip invisible children when laying out; hidden controls don't get input
  or focus, and a focused control that's hidden releases focus.
- **Bevy**: `Visibility::Hidden` is inherited (`InheritedVisibility`) and
  removes the subtree from rendering; UI layout uses a separate
  `Display::None` to take a node out of layout.

---

## 4. Design

### 4.1 Component

```ts
interface VisibilityEcsComponent {
  /** `false` hides this entity and every descendant. */
  visible: boolean;
}

/** `false` if `entity` or any ancestor has `visible: false`. */
function isVisibleInHierarchy(world: EcsWorld, entity: number): boolean;
```

An entity without the component is visible unless an ancestor isn't. The
component lives in the rendering module, which rendering, text, particles
and UI all depend on.

`isVisibleInHierarchy` walks up the hierarchy. The render system and UI
systems resolve it once per entity per frame, in the same pass that
resolves draw order (`createDrawOrderResolver`),
so nothing stores a derived value and nothing has to keep one in sync.

### 4.2 What respects it

- **Rendering**: sprites and text hidden in the hierarchy produce no draw
  commands, in the world and in UI alike.
- **UI layout**: layout groups and content size fitters treat hidden
  children as absent, as they treat `ignoreLayout` children today. The
  rect transforms of hidden elements are still resolved, so showing one
  doesn't flash at a stale position.
- **Raycasts**: hidden elements aren't hit.
- **Navigation**: hidden elements aren't focus candidates. If the focused
  element becomes hidden, focus is released, as in Godot. A controller
  user isn't stranded: with nothing focused, the next direction press
  already focuses the topmost candidate, and game code that refocuses
  something itself (the demo refocuses the button that opened a page)
  isn't overridden.
- **Presses in progress**: a press or drag on an element that becomes
  hidden is cancelled (the slider's drag would otherwise keep following
  the pointer).
- **Particle emitters**: an emitter on an entity hidden in the hierarchy
  doesn't emit. Particles already emitted are their own world-space
  entities and finish their lives, so hiding a ship stops its exhaust
  trail without cutting it off.

### 4.3 Canvas groups and `enabled`

Canvas groups are unchanged. Fading a page in or out uses `alpha` (the
demo's run screens do); hiding uses `visible`. A fade that ends hidden
sets `visible: false` at the end.

`SpriteEcsComponent.enabled` and `TextEcsComponent.enabled` overlap with
`visible`: both hide a sprite, and raycasts ignore `enabled`. Whether they
stay is open question 1.

---

## 5. Phases

### Phase 1: Subtree visibility

| #   | Task                                                                                      | Size |
| --- | ----------------------------------------------------------------------------------------- | ---- |
| 1.1 | Component, factory, `isVisibleInHierarchy`; tests                                         | S    |
| 1.2 | Render and text systems skip hidden entities; emitters on hidden entities don't emit      | S    |
| 1.3 | Layout groups and content size fitters skip hidden children                               | M    |
| 1.4 | Raycast and navigation skip hidden elements; focus released and presses cancelled on hide | M    |
| 1.5 | Dropdown and tooltip hide through `visible`                                               | S    |
| 1.6 | UI guide section "Hiding and fading"; docs demo; changelog under `#### Added`             | S    |

**Definition of done:** hiding a button in a vertical layout group closes
the gap; a hidden page draws nothing and can't be clicked or focused; the
dropdown and tooltip have no hand-written hiding.

Builds on the draw order's per-frame resolution pass
(`createDrawOrderResolver`), which has landed. The hierarchy it walks (`EcsWorld.getChildren`)
has landed.

---

## 6. Decision log

### DL-1: One switch for rendering, layout and input

**Options.** (a) One `visible` that does all three (Unity, Godot). (b)
Separate switches for rendering and layout (Bevy's `Visibility` and
`Display::None`).

**Decision: (a).**

**Rationale.** Every case in the demo, the dropdown and the tooltip wants
all three together. Collapsing an element while keeping it drawn isn't a
case anyone has; keeping it laid out while invisible is what `alpha: 0`
already does.

### DL-2: Computed on read, not propagated into a stored field

**Options.** (a) Walk ancestors when needed, once per entity per frame.
(b) A propagation system writing an inherited flag (Bevy's
`InheritedVisibility`).

**Decision: (a).**

**Rationale.** Hierarchies are shallow, and the systems that need it walk
the hierarchy anyway. (b) adds a system to order and a field with a
single writer to protect, for no saving at Forge's scales. It matches how
`resolveCanvasGroupState` already resolves canvas groups.

### DL-3: Release focus when the focused element is hidden

**Options.** (a) Move focus to the nearest visible candidate. (b) Release
it (Godot).

**Decision: (b).**

**Rationale.** The navigation system already recovers from empty focus on
the next direction press, and (a) would fight game code that chooses what
to focus next.

---

## 7. Open questions

1. **Should `SpriteEcsComponent.enabled` and `TextEcsComponent.enabled`
   go?** Godot and Bevy have one switch per node or entity. Keeping both
   means two ways to hide a sprite with different input behavior.
   - (a) Remove them; a part that needs hiding on its own goes on its own
     child entity (proposed). (b) Keep them for hiding one component of an
     entity, and make raycasts respect them.

---

## 8. Testing considerations

- `isVisibleInHierarchy` through several levels, with and without the
  component.
- Rendering: a hidden parent hides children's sprites and text.
- Layout: vertical, horizontal and grid groups with a hidden child; a
  content size fitter shrinks.
- Navigation: a hidden button is skipped; focus is released when its page
  is hidden; a slider drag is cancelled when the slider is hidden.
- Particles: a hidden emitter stops emitting; its live particles remain.

## 9. Documentation and demo follow-up

- `ui/` guides: "Hiding and fading", contrasting `visible` with canvas
  group `alpha`.
- Demo: the five `setShown` helpers become `visible` assignments; the
  manual button repositioning goes once the buttons sit in a layout group;
  the speed HUD's ring segments become children of one anchor entity,
  which the anchor system moves, turns and hides.
