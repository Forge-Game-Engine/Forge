# Design: Input Actions Read Their Sources' State

|                                       |                                                                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                   |
| **Kind**                              | Defect                                                                                                                                              |
| **Found in**                          | Galactic Journey demo: `src/input/create-inputs.ts` (three `actionResetTypes.noReset` axes), `src/run/run-input.system.ts` (`shootInput.endHold()`) |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                            |
| **Related**                           | the text input field, which made the keyboard source ignore keys typed into editable elements                                                       |

## 0. Targeted modules

| Path                                                   | Change   | Notes                                                                                             |
| ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------- |
| `src/input/input-manager.ts`                           | Modified | Keeps each source's input per action and derives action state from it; the only writer of actions |
| `src/input/actions/*.ts`                               | Modified | Read-only to game code; reset type removed; axes no longer `Resettable`                           |
| `src/input/constants/action-reset-types.ts`            | Removed  | `actionResetTypes` and `ActionResetType`                                                          |
| `src/input/keyboard/input-sources/`                    | Modified | Reports key state through the new manager methods                                                 |
| `src/input/mouse/input-sources/`                       | Modified | Wheel input lasts one frame because the mouse source withdraws it, not because the action resets  |
| `src/input/gamepad/input-sources/`                     | Modified | Reports every poll; the dispatch-on-change workaround and the disconnect release loop are deleted |
| `documentation-site/docs/docs/input/*.md`              | Modified | Reset-behavior section removed; group switching rewritten                                         |
| `documentation-site/src/pages/demos/*`, `e2e/fixtures` | Modified | Drop `actionResetTypes.noReset` and the scenes kept only to demonstrate the wrong default         |

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
   three of its axes. So does every axis driven by keys, sticks or the
   cursor in the docs-site demos, the guides and the e2e scenes, apart from
   two e2e actions kept broken on purpose to demonstrate the pitfall. Only
   mouse-wheel axes use the default, correctly. The guides carry a caution
   about it.
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
- **The wheel's scale** (`deltaY / 100`, clamped to `[-1, 1]`). Unchanged,
  though a frame's wheel events are now summed rather than the last one
  winning (§4.2).

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
  setAxis1dInput(
    source: InputSource,
    action: Axis1dAction,
    value: number,
  ): void;
  setAxis2dInput(
    source: InputSource,
    action: Axis2dAction,
    x: number,
    y: number,
  ): void;
  /** Records whether `source` is holding any button bound to `action`. */
  setHoldInput(source: InputSource, action: HoldAction, isDown: boolean): void;
  /** Records a trigger binding's button going down or up. */
  setTriggerInput(
    source: InputSource,
    binding: TriggerInputBinding,
    isDown: boolean,
  ): void;
  /** Forgets everything `source` reported, e.g. when it's stopped or unplugged. */
  removeSourceInput(source: InputSource): void;
}
```

`TriggerInputBinding` is the shape the keyboard, mouse and gamepad trigger
bindings already share: an `action` and the `moment` (down or up) it fires
on.

The reported state is kept whether or not the action's group is active.
Reporting for an action that was never added to the manager throws, which
replaces the guide's caution that such actions are silently never
released. Derived state:

- **Axes**: in the active group, the reported value with the largest
  magnitude (Unity's conflict resolution); for 2D axes, the largest vector
  length, with one source supplying both components. On a tie the source
  already driving the action keeps it, as in Unity. Outside the active
  group, `0`. A source still combines its own bindings for an action as it
  does today (W and Up arrow on the same action don't add up past `1`).
- **Holds**: held while any source holds it, provided the hold started with
  a fresh press (§4.3). Each source combines its own bindings for a hold
  (OR), so Space and Enter bound to one hold don't cancel each other within
  the keyboard, as the gamepad source already does.
- **Triggers**: a down-moment trigger fires when a binding's button goes
  down while its group is active. An up-moment trigger fires when it comes
  up while the group is active, and only if the same source pressed it
  while the group was active, so a release can't carry a press over from
  another group any more than a hold can. `isTriggered` reads `true` for
  that frame.

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
report (today the last event of a frame wins; summing is what Unity does,
and the changelog says so), and withdraws it (reports `0`) in its own
`reset` at the end of the frame. The cursor-position binding reports the position on every
`mousemove` and keeps it, so it no longer needs `noReset` either.

Reset types aren't what makes an input discrete or held. The action's
kind and the source are:

| Behavior                                         | Action                  | What provides it                                                                   |
| ------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------- |
| Once per press ("press space to jump")           | `TriggerAction`         | `isTriggered` for the frame the key goes down, as today                            |
| While held (movement, charging)                  | `HoldAction` or an axis | The source's report, kept from keydown to keyup (auto-repeats are already ignored) |
| One step per press on an axis (menu navigation)  | An axis                 | Edge detection on its value, as `ui-navigation-system` already does                |
| One frame, from an input with no release (wheel) | An axis                 | The mouse source withdrawing its report after the frame                            |

Whether a value lasts one frame depends on the input, not the action: a
zoom axis bound to the wheel and to `+`/`-` needs the wheel's contribution
to last a frame and the keys' to last while they're held, which a reset
on the action can't express. Unity resets delta controls on the device,
and Godot sends a wheel turn as a press and a release; neither has a reset
on the action.

### 4.3 Switching groups

`setActiveGroup(group)`:

- **Deactivated group**: its axes read `0` and its holds end, raising the
  matching events where the state changes (as today).
- **Activated group**: its axes read the sources' current input straight
  away (Unity's initial state check for value actions). A movement key held
  through a pause menu keeps moving once the game resumes.
- **Holds need a fresh press.** A fresh press is a source's report for
  the hold going from up to down while the group is active. A button that
  is already down when its group becomes active doesn't start a hold, and
  a gamepad reporting "down" again every poll isn't a new press. This is
  Unity's behavior for button actions, and it's what the demo needs: one
  physical button usually means different things in different groups, and
  carrying its press over turns "submit" into "shoot".
- **Triggers**: as in §4.1. A press or release while the group is inactive
  is dropped, and a release only counts for a press made while the group
  was active.

The manager no longer needs the suspended values it keeps today
(`_suspendedAxis1dValues`, `_suspendedAxis2dValues`, `_suspendedHolds`):
the reported input is already there, for every group.

### 4.4 The manager is the only writer

Today `set`, `startHold`, `endHold`, `trigger` and `reset` are public on
the actions, and the demo uses `endHold` to fix up state the manager got
wrong. With the manager deriving state, a second writer would be
overwritten or would put the derived state out of step with the reports.

The actions keep their read API (`value`, `isHeld`, `isTriggered`, the
events, `name`, `inputGroup`). `inputGroup` becomes `readonly`: derived
state depends on it, and only constructors set it today. Their state is written through functions
internal to the input module (not exported from
`@forge-game-engine/forge/input`), which only the manager calls. Unit tests
that set an action directly (`ui-navigation-system.test.ts`,
`camera-system.test.ts`) drive it through a manager and a test source
instead.

### 4.5 Sources

- **Keyboard**: reports each axis action from the keys held (as it does
  today), each hold from whether any of its keys is held, and trigger
  bindings' keys going down and up. Its `_keyPressesDown` and
  `_keyPressesUps` sets are written but never read; they're deleted, and
  the source stops being `Resettable`.
- **Mouse**: reports buttons (combined per hold, like the keyboard) and
  cursor position as they change, and the wheel as in §4.2.
- **Gamepad**: reports every poll. The `_lastDispatched*` maps exist only
  to stop an idle gamepad overwriting the keyboard every frame; with
  reports combined per source they're deleted, and so is the loop that
  sends zeros and hold ends on disconnect (it becomes one
  `removeSourceInput` call).
- **Every source's `stop()`** calls `removeSourceInput`, so stopping a
  source releases whatever it held. Today none of them does.

---

## 5. Phases

### Phase 1: State-derived actions

| #   | Task                                                                                                                                                                                                             | Size |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | Per-source input store in `InputManager`; derived axes (largest magnitude, ties keep the current source), holds and triggers; unregistered actions throw                                                         | M    |
| 1.2 | `setActiveGroup` per §4.3; remove the suspended-state maps                                                                                                                                                       | S    |
| 1.3 | Remove `actionResetTypes`, `ActionResetType` and the axis reset; mouse source sums and withdraws wheel input per frame                                                                                           | S    |
| 1.4 | Actions read-only to game code (`inputGroup` included); internal write functions used only by the manager                                                                                                        | S    |
| 1.5 | Migrate keyboard, mouse and gamepad sources (per-action hold combining, `removeSourceInput` in `stop()`); delete the gamepad's dispatch-on-change and disconnect loop and the keyboard's unused press sets       | M    |
| 1.6 | Unit tests (§8); migrate tests that set actions directly and tests that assert holds resume on activation                                                                                                        | M    |
| 1.7 | e2e: delete the "broken" reset-type actions in the keyboard and gamepad scenes; drop `actionResetTypes` from the mouse and camera-pan-zoom scenes and the spec titles that mention it; add the group-switch case | S    |
| 1.8 | Migrate docs-site demos (seven `noReset` call sites) and guides, including `events/custom-events.md`'s mention of `Axis2dAction.set()`; changelog under `#### Changed`                                           | S    |

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
  axis, largest magnitude wins, ties keep the current source, and
  releasing one leaves the other's value; two sources on one hold,
  releasing one keeps it held and the start event is raised once; two
  keys on one hold within the keyboard; wheel input summed for one frame;
  reporting for an unregistered action throws.
- Group switching: axes read current input on activation and `0` on
  deactivation; a hold whose button is down at activation doesn't start
  until a new press; triggers pressed while inactive are dropped; an
  up-moment trigger pressed in another group doesn't fire on release.
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
