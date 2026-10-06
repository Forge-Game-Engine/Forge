# Design: Hiding an Entity Hides Its Subtree

|                                       |                                                                                                                                                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                                |
| **Kind**                              | Feature                                                                                                                                                                                                          |
| **Found in**                          | Galactic Journey demo: `setShown` helpers in `src/game-over/create-stats-panel.ts`, `create-flight-history-page.ts`, `pilot-panel.system.ts`, `src/main-menu/create-main-menu.ts`; the stats panel's button repositioned by hand when the one above it is hidden |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                         |
| **Related**                           | [`ui-system.md`](./ui-system.md), [`hierarchy-removal.md`](./hierarchy-removal.md), [`sprite-draw-order.md`](./sprite-draw-order.md), [`game-states.md`](./game-states.md)                                         |

## 0. Targeted modules

| Path                                                     | Change   | Notes                                                                                   |
| -------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `src/common/components/visibility-component.ts`          | **New**  | `VisibilityEcsComponent { visible }`; `isVisibleInHierarchy`                            |
| `src/rendering/systems/render-system.ts`, `src/text/rendering/*` | Modified | Skip entities hidden in the hierarchy                                           |
| `src/ui/systems/ui-layout-group-system.ts`               | Modified | Hidden children take no space                                                           |
| `src/ui/systems/ui-raycast-system.ts`, `ui-navigation-system.ts` | Modified | Hidden elements can't be hit or focused; focus leaves an element that's hidden  |
| `documentation-site/docs/docs/ui/`, `common/`            | Modified | Hiding vs. fading                                                                       |

---

## 1. Summary

Forge can hide one sprite (`SpriteEcsComponent.enabled`) or one text
(`TextEcsComponent.enabled`), and can fade a UI subtree with a
`CanvasGroupEcsComponent` (`alpha`, `interactable`, `blocksRaycasts`). It
can't hide a subtree. The demo shows and hides pages, page sections and
buttons through a canvas group, with the same three-line helper in four
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

Every engine with a scene hierarchy has a subtree visibility switch that
removes the subtree from rendering, layout and input together. This
design adds one, and leaves canvas groups for what they're for: fading
and disabling interaction.

---

## 2. Scope

### In scope

- `VisibilityEcsComponent` on any entity, inherited by descendants.
- Rendering, UI layout groups, raycasts and focus navigation respecting it.

### Out of scope

- **Disabling a subtree's logic** (Unity's inactive GameObjects stop their
  scripts). Systems decide for themselves what a hidden entity means;
  pausing whole groups of systems is [`game-states.md`](./game-states.md).
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
  or focus.
- **Bevy**: `Visibility::Hidden` is inherited (`InheritedVisibility`) and
  removes the subtree from rendering; UI layout uses `Display::None` to
  take a node out of layout.

---

## 4. Design

### 4.1 Component

```ts
interface VisibilityEcsComponent {
  /** `false` hides this entity and every descendant. */
  visible: boolean;
}

/** `false` if `entity` or any ancestor has `visible: false`. */
function isVisibleInHierarchy(world: EcsWorld, entity: Entity): boolean;
```

An entity without the component is visible unless an ancestor isn't. The
component lives in the common module next to the hierarchy and
transforms, since rendering, text and UI all read it.

`isVisibleInHierarchy` walks up the hierarchy. The render system and UI
systems resolve it once per entity per frame (the same pass that resolves
world draw order in [`sprite-draw-order.md`](./sprite-draw-order.md)), so
nothing stores a derived value and nothing has to keep one in sync.

### 4.2 What respects it

- **Rendering**: sprites and text hidden in the hierarchy produce no draw
  commands. `enabled` still hides just that one component.
- **UI layout**: layout groups, content size fitters and aspect ratio
  fitters treat hidden children as absent, as they treat
  `ignoreLayout` children today. The rect transforms of hidden elements
  are still resolved, so showing one doesn't flash at a stale position.
- **Raycasts**: hidden elements aren't hit.
- **Navigation**: hidden elements aren't focus candidates. If the focused
  element becomes hidden, focus moves to the nearest visible candidate in
  the same canvas, or is cleared if there is none.

### 4.3 Canvas groups

Unchanged. Fading a page in or out uses `alpha` (the demo's run screens
do); hiding uses `visible`. A fade that ends hidden sets `visible: false`
at the end.

---

## 5. Phases

### Phase 1: Subtree visibility

| #   | Task                                                                                 | Size |
| --- | ------------------------------------------------------------------------------------ | ---- |
| 1.1 | Component, factory, `isVisibleInHierarchy`; tests                                    | S    |
| 1.2 | Render and text systems skip hidden entities                                         | S    |
| 1.3 | Layout groups and fitters skip hidden children                                       | M    |
| 1.4 | Raycast and navigation skip hidden elements; focus moves off a hidden element        | M    |
| 1.5 | UI guide section "Hiding and fading"; docs demo; changelog under `#### Added`        | S    |

**Definition of done:** hiding a button in a vertical layout group closes
the gap; a hidden page draws nothing and can't be clicked or focused.

---

## 6. Decision log

### DL-1: One switch for rendering, layout and input

**Options.** (a) One `visible` that does all three (Unity, Godot). (b)
Separate switches for rendering and layout (Bevy's `Visibility` and
`Display::None`).

**Decision: (a).**

**Rationale.** Every case in the demo wants all three together.
Collapsing an element while keeping it drawn isn't a case anyone has;
keeping it laid out while invisible is what `alpha: 0` already does.

### DL-2: Computed on read, not propagated into a stored field

**Options.** (a) Walk ancestors when needed, once per entity per frame.
(b) A propagation system writing an inherited flag (Bevy's
`InheritedVisibility`).

**Decision: (a).**

**Rationale.** Hierarchies are shallow, and the systems that need it walk
the hierarchy anyway. (b) adds a system to order and a field with a
single writer to protect, for no saving at Forge's scales.

---

## 7. Open questions

1. **Where does focus go when the focused element is hidden?** Unity
   leaves the event system's selection on the inactive object; Godot
   releases focus.
   - (a) The nearest visible candidate (proposed, so a controller user
     isn't left with nothing focused). (b) Clear focus.

---

## 8. Testing considerations

- `isVisibleInHierarchy` through several levels, with and without the
  component.
- Rendering: a hidden parent hides children's sprites and text.
- Layout: vertical, horizontal and grid groups with a hidden child; a
  content size fitter shrinks.
- Navigation: a hidden button is skipped; focus moves when its page is
  hidden.

## 9. Documentation and demo follow-up

- `ui/` guides: "Hiding and fading", contrasting `visible` with canvas
  group `alpha`.
- Demo: the four `setShown` helpers become `visible` assignments; the
  manual button repositioning goes once the buttons sit in a layout group.
