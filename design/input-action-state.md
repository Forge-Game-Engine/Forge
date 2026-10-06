# Design: Input Actions Read Their Sources' State

|                                       |                                                                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                     |
| **Kind**                              | Defect                                                                                                                                                |
| **Found in**                          | Galactic Journey demo: `src/input/create-inputs.ts` (three `actionResetTypes.noReset` axes), `src/run/run-input.system.ts` (`shootInput.endHold()`) |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                              |
| **Related**                           | [`text-input-field.md`](./text-input-field.md) (keyboard source changes), [`game-states.md`](./game-states.md)                                        |

## 0. Targeted modules

| Path                                                   | Change   | Notes                                                                                              |
| ------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------- |
| `src/input/input-manager.ts`                           | Modified | Keeps each source's input per action and derives action state from it; the only writer of actions |
| `src/input/actions/*.ts`                               | Modified | Read-only to game code; reset type removed; axes no longer `Resettable`                            |
| `src/input/constants/action-reset-types.ts`            | Removed  | `actionResetTypes` and `ActionResetType`                                                           |
| `src/input/keyboard/input-sources/`                    | Modified | Reports key state through the new manager methods                                                  |
| `src/input/mouse/input-sources/`                       | Modified | Wheel input lasts one frame because the mouse source withdraws it, not because the action resets   |
| `src/input/gamepad/input-sources/`                     | Modified | Reports every poll; the dispatch-on-change workaround and the disconnect release loop are deleted  |
| `documentation-site/docs/docs/input/*.md`              | Modified | Reset-behavior section removed; group switching rewritten                                          |
| `documentation-site/src/pages/demos/*`, `e2e/fixtures` | Modified | Drop `actionResetTypes.noReset` and the scenes kept only to demonstrate the wrong default          |

---

## 1. Summary

Forge's input actions hold whatever value a source last sent them. The
keyboard sends a value when a key goes down or up, the gamepad when a stick
or button changes, and the mouse when the cursor moves or the wheel turns.
Between those events, the action keeps the value, unless something else
changes it. Three things do, and each is a defect the demo works around:

1. **Axes reset to zero every frame by default.** `Axis1dAction` and
   `Axis2dAction` default to `actionResetTypes.zero`, which sets them to
   `0` at the end of every frame. Every source except the mouse wheel only
   sends on a change, so a held key or stick reads correctly for one frame
   and `0` after that. The demo passes `actionResetTypes.noReset` to all
   three of its axes. So does every docs-site demo, every guide sample and
   every e2e scene except the two that keep a broken action to demonstrate
   the pitfall. The guides carry a caution about it.
2. **A hold carries over a group switch.** When the active input group
   changes, `InputManager` starts the new group's holds whose buttons are
   already down. The demo binds the controller's A button to both "submit"
   (menu group) and "shoot" (game group). Pressing A to restart switches
   to the game group with A still down, and the new ship opens fire. The
   demo ends the hold by hand after every switch (`shootInput.endHold()`).
3. **Two sources bound to one action overwrite each other.** The demo
   binds Space and the left mouse button to "shoot", and the keyboard and
   gamepad to both movement axes. Releasing Space ends the hold while the
   mouse button is still down. Nudging the stick and letting go sets the
   axis to `0` while a movement key is still held. The gamepad source only
   sends on change for this reason, so it doesn't overwrite the keyboard
   every frame.

All three come from the same place: an action's state is written by
events, last writer wins, and the engine then repairs that state in three
places (the per-frame reset, the "suspended" values it replays on a group
switch, and the gamepad's dispatch-on-change). This design makes the
sources' current state the source of truth: each source reports what it's
doing for each action, and the manager derives the action's state from
those reports and the active group.

---

## 2. Scope

### In scope

- `InputManager` keeping each source's latest input per action, and
  deriving axis values and hold state from it.
- Removing `actionResetTypes`/`ActionResetType` and the axis reset.
- Wheel input lasting one frame, owned by the mouse source.
- Group switching: axes pick up current input, holds need a press made
  while their group is active.
- Making the manager the only writer of action state.
- Migrating every source, guide, docs-site demo, e2e scene and test.

### Out of scope

- **Releasing input when the page loses focus.** A key held while the
  window loses focus never gets its `keyup` and stays held. That's a
  separate source defect (the keyboard and mouse sources should release
  everything on `blur`), worth its own small fix.
- **Rebinding UI, binding composites, processors (dead zones, scaling) and
  interactions (tap, double tap).** None are needed by the demo.
- **The wheel's scale** (`deltaY / 100`, clamped to `[-1, 1]`). Unchanged.

---

## 3. How established engines handle this

- **Unity (Input System)**: an action reads the state of the controls bound
  to it. "Value" actions do conflict resolution: when several controls are
  actuated, the one with the largest magnitude drives the action. Delta
  controls (mouse delta, scroll) are reset to zero by the device at the
  start of each frame, not by the action. When an action map is enabled,
  Value actions run an initial state check and pick up controls that are
  already actuated. Button actions don't, so a button already held when
  its map is enabled doesn't perform the action until it's released and
  pressed again.
- **Godot**: `Input` tracks the state of each event mapped to an action
  per device, and the action's strength is the strongest of them, so one
  device going idle doesn't cancel another.

Both treat the action as a view over device state, not as a value that
input events push into.

---

## 4. Design

### 4.1 Sources report state; the manager derives actions

The manager keeps, per action, the latest input each source reported for
it. Sources report through four methods, which replace the
`dispatch*Action` methods:

```ts
class InputManager {
  /** Records `source`'s current value for `action`. */
  setAxis1dInput(source: InputSource, action: Axis1dAction, value: number): void;
  setAxis2dInput(source: InputSource, action: Axis2dAction, x: number, y: number): void;
  /** Records whether `source` is holding a button bound to `action`. */
  setHoldInput(source: InputSource, action: HoldAction, isDown: boolean): void;
  /** Fires `action` if its group is active. */
  fireTrigger(action: TriggerAction): void;
  /** Forgets everything `source` reported, e.g. when it's stopped or unplugged. */
  removeSourceInput(source: InputSource): void;
}
```

The reported state is kept whether or not the action's group is active.
Derived state:

- **Axes**: in the active group, the reported value with the largest
  magnitude (Unity's conflict resolution). Outside it, `0`. A source still
  combines its own bindings as it does today (W and Up arrow on the same
  action don't add up past `1`).
- **Holds**: held while any source holds it, provided the hold started with
  a press made while its group was active (§4.3).
- **Triggers**: unchanged. A trigger fires on a press while its group is
  active and reads `isTriggered` for that frame.

`valueChangeEvent`, `holdStartEvent` and `holdEndEvent` are raised when the
derived state changes, so reporting the same state again raises nothing,
and a second source pressing an already-held hold doesn't raise a second
`holdStartEvent`.

### 4.2 No reset types

`actionResetTypes`, `ActionResetType`, the axis constructors' third
parameter and the axes' `reset` are removed. An axis holds its value until
its sources report a different one.

The mouse wheel is the only source whose input describes a single frame,
so the mouse source owns that: it sums the frame's wheel events into its
report, and withdraws it (reports `0`) in its own `reset` at the end of
the frame. The cursor-position binding reports the position on every
`mousemove` and keeps it, so it no longer needs `noReset` either.

### 4.3 Switching groups

`setActiveGroup(group)`:

- **Deactivated group**: its axes read `0` and its holds end, raising the
  matching events where the state changes (as today).
- **Activated group**: its axes read the sources' current input straight
  away (Unity's initial state check for value actions). A movement key held
  through a pause menu keeps moving once the game resumes.
- **Holds need a fresh press.** A button that is already down when its
  group becomes active doesn't start a hold. The hold starts the next time
  any of its sources reports a press. This is
  Unity's behavior for button actions, and it's what the demo needs: one
  physical button usually means different things in different groups, and
  carrying its press over turns "submit" into "shoot".
- **Triggers**: unchanged. They fire on a press or release event, and one
  that happens while the group is inactive is dropped.

The manager no longer needs the suspended values it keeps today
(`_suspendedAxis1dValues`, `_suspendedAxis2dValues`, `_suspendedHolds`):
the reported input is already there, for every group.

### 4.4 The manager is the only writer

Today `set`, `startHold`, `endHold`, `trigger` and `reset` are public on
the actions, and the demo uses `endHold` to fix up state the manager got
wrong. With the manager deriving state, a second writer would be
overwritten or would put the derived state out of step with the reports.

The actions keep their read API (`value`, `isHeld`, `isTriggered`, the
events, `name`, `inputGroup`). Their state is written through functions
internal to the input module (not exported from
`@forge-game-engine/forge/input`), which only the manager calls. Unit tests
that set an action directly (`ui-navigation-system.test.ts`,
`camera-system.test.ts`) drive it through a manager and a test source
instead.

### 4.5 Sources

- **Keyboard**: reports each axis action from the keys held (as it does
  today) and each hold's key state, on key down and up. `stop` calls
  `removeSourceInput`.
- **Mouse**: reports buttons and cursor position as they change, and the
  wheel as in §4.2.
- **Gamepad**: reports every poll. The `_lastDispatched*` maps exist only
  to stop an idle gamepad overwriting the keyboard every frame; with
  reports combined per source they're deleted, and so is the loop that
  sends zeros and hold ends on disconnect (it becomes one
  `removeSourceInput` call).

---

## 5. Phases

### Phase 1: State-derived actions

| #   | Task                                                                                                          | Size |
| --- | ------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | Per-source input store in `InputManager`; derived axes (largest magnitude) and holds (any source)             | M    |
| 1.2 | `setActiveGroup` per §4.3; remove the suspended-state maps                                                    | S    |
| 1.3 | Remove `actionResetTypes`, `ActionResetType` and the axis reset; mouse source withdraws wheel input per frame | S    |
| 1.4 | Actions read-only to game code; internal write functions used only by the manager                             | S    |
| 1.5 | Migrate keyboard, mouse and gamepad sources; delete the gamepad's dispatch-on-change and disconnect loop      | M    |
| 1.6 | Unit tests (§8); migrate tests that set actions directly                                                      | M    |
| 1.7 | e2e: delete the "broken" reset-type actions in the keyboard and gamepad scenes; add the group-switch case     | S    |
| 1.8 | Migrate docs-site demos (seven `noReset` call sites) and guides; changelog under `#### Changed`               | S    |

**Definition of done:** no `actionResetTypes` anywhere; every axis
created with the two-argument constructor reads a held key, stick or
cursor every frame; a button held across a group switch doesn't start the
new group's hold; the docs-site demos and e2e suite pass.

---

## 6. Decision log

### DL-1: Remove reset types instead of flipping the default

**Options.** (a) Default to `noReset`, keep `zero` for wheel actions. (b)
Remove the option; the mouse source withdraws its wheel input each frame.

**Decision: (b).**

**Rationale.** Whether input describes one frame is a property of the
source (a wheel tick) not of the action: the same "zoom" action can be
bound to the wheel and to two keys, and no single reset type is right for
both. Unity resets delta controls at the device for the same reason. (a)
leaves an option whose only correct use is one binding type, and whose
wrong use is silent.

### DL-2: The largest magnitude wins between sources

**Options.** (a) Last report wins (today). (b) Sum and clamp. (c) Largest
magnitude.

**Decision: (c).**

**Rationale.** (a) is the defect. (b) lets an idle stick's drift add to a
key, and makes opposite inputs on two devices cancel. (c) is Unity's and
Godot's rule, and gives the intuitive result: whichever device the player
is actually pushing drives the action.

### DL-3: Holds need a fresh press after a group switch

**Options.** (a) Resume held buttons (today). (b) Require a press made
while the group is active. (c) A per-action setting.

**Decision: (b).**

**Rationale.** The same button commonly means different things in
different groups, so a press belongs to the group that was active when it
happened. Unity's button actions behave this way by default. Axes keep
picking up current input because they describe a continuous state (a
direction held), not an event. (c) is open question 1.

### DL-4: Actions are read-only to game code

**Rationale.** One writer per value. The demo's `endHold()` call is a
second writer compensating for the first; once the first is right, the
second only has ways to break it.

---

## 7. Open questions

1. **Should some holds resume across a group switch?** Unity has a
   per-action "initial state check" option for button actions. A sprint
   button held through a pause menu might be one case.
   - (a) No option until a game needs it (proposed). (b) Add it now.
2. **Should game code be able to make an action wait for a fresh press
   without switching groups** (e.g. after a cutscene)? Switching to a
   cutscene group does that already.
   - (a) No (proposed). (b) Add a `requireFreshPress(action)` method.

---

## 8. Testing considerations

- Manager: a held key reads its value every frame; two sources on one
  axis, largest magnitude wins, and releasing one leaves the other's
  value; two sources on one hold, releasing one keeps it held and the
  start event is raised once; wheel input reads for one frame.
- Group switching: axes read current input on activation and `0` on
  deactivation; a hold whose button is down at activation doesn't start
  until a new press; triggers pressed while inactive are dropped.
- Gamepad: an idle gamepad doesn't override a held key; unplugging
  releases what it held.
- e2e: `keyboard-input` and `gamepad-input` lose their deliberately broken
  actions and the assertions on the "one frame then zero" pitfall; a new
  case switches groups with a key held and checks the hold waits for a
  fresh press.

## 9. Documentation and demo follow-up

- `input/actions.md`: the "Reset behavior" section and its caution are
  deleted; "What happens when the active group changes" describes §4.3;
  writing a custom source uses the §4.1 methods. `input/keyboard.md`,
  `mouse.md`, `gamepad.md` and `index.md` drop `actionResetTypes`.
- Demo: the three `noReset` arguments and the `shootInput.endHold()` block
  in `run-input.system.ts` are deleted.
