---
name: fix-defect
description: Fix a bug, defect, regression or wrong behavior in the Forge engine by correcting it at its root cause and changing the behavior outright - no backwards-compatibility shims, opt-in flags, `inverted`-style boolean options, deprecated aliases or fallback code paths. Use whenever asked to fix a bug, defect, issue, regression or "this is wrong/broken" report, or when a fix is tempting you to add an option.
---

# Fix a Defect

A bug fix should leave the engine **simpler or the same size** as it was,
not bigger. Forge is pre-1.0 (check `version` in `package.json`), so
breaking changes are allowed and expected. Don't preserve the old, wrong
behavior. Change it, update every caller, and say so in the changelog.

The failure mode this skill exists to stop: every fix bolts on an option so
the old behavior survives "for compatibility", and the engine ends up with a
pile of booleans that toggle between right and wrong. Example: a gamepad
stick reports up as `-1` while the rest of the engine is Y-up (keyboard
`W`/`S`, sprites, text, world space). The fix that shipped added an
`inverted` option to `GamepadAxis1dBinding` and `invertX`/`invertY` to
`GamepadAxis2dBinding`, so every user has to know to set it. The correct fix
normalizes the stick's Y axis inside `GamepadInputSource` so up is positive
for everyone, and adds no options.

## 1. Reproduce it with a failing test

Before touching the fix, write the test that fails because of the bug:

- A unit test next to the code (`*.test.ts`) for logic in one system or
  class.
- An e2e scenario (see the `write-e2e-test` skill) when the bug only shows
  up across systems, on a real canvas, or with real input events.

Run it and watch it fail for the reason the report describes. If you can't
reproduce it, stop and tell the user what you tried. Don't ship a
speculative fix.

## 2. Find the root cause and the layer that owns it

Trace the wrong value back to the first place it goes wrong. Fix it there,
not where the symptom shows up.

- Ask what the engine's convention is (Y-up, CSS pixels for anything the DOM
  measures, premultiplied alpha in render targets, `[-1, 1]` axes, ...; see
  AGENTS.md's "Common Patterns"). The defect is usually one layer breaking
  that convention. Make that layer follow it, so nothing downstream has to
  compensate.
- If the bug comes from an external source (browser API, W3C spec, file
  format) that disagrees with the engine, translate at the boundary where
  the data enters the engine (the input source, the loader, the parser).
  Don't pass the disagreement on to the user as an option.
- If several call sites each work around the same bug, the fix belongs in
  the thing they all call. Then delete the workarounds.
- List every writer of the value that goes wrong (`grep` for assignments
  and in-place `Vec2` mutations across `/src`). Each component field has one
  owner. If two systems write it, that's the root cause, whichever one the
  symptom shows up in. For example, `position.world` is owned by
  `createTransformEcsSystem`, so a system that writes it directly is the
  bug, not the transform system overwriting it.
- Name the problem in general terms and check how Unity, Godot and Bevy
  solve it. Use that well-understood solution unless you can state why it
  doesn't fit Forge.
- If the only fix you can find bends a core engine design, or the report
  depends on a relationship that doesn't make sense in an ECS engine, stop
  and raise it with the user instead of building on it.

Before you change any code, run the `solution-reviewer` agent
(`.claude/agents/solution-reviewer.md`) with the report, the root cause you
found and the fix you plan, and act on its verdict.

## 3. Change the behavior outright

Make the code do the correct thing unconditionally. Then update everything
that depended on the old behavior in the same change: `/src` callers, tests,
`/demo`, `documentation-site` demos and docs, and `/e2e` fixtures.

**Never** add any of these to keep old behavior alive:

| Don't add                                                                                   | Do instead                                                       |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| A boolean/enum option that switches the fix on or off (`inverted`, `useNewX`, `legacyMode`) | Make the fixed behavior the only behavior                        |
| An option whose only purpose is to correct a wrong default                                  | Fix the default and remove the need for the option               |
| A deprecated alias, re-export, or wrapper keeping an old name or signature                  | Rename/re-sign it and update every caller                        |
| Overloads or union types accepting both the old and new argument shapes                     | Accept only the new shape                                        |
| A fallback branch to the old code path ("if not set, behave like before")                   | Delete the old code path                                         |
| A "for backwards compatibility" / "kept for existing users" comment                         | Nothing. There are no compatibility guarantees before 1.0        |
| A runtime warning for the old usage                                                         | A type error from the changed signature, plus a changelog bullet |
| An option that filters which entities a system processes (a configurable `query` or `tags`) | Fix whichever system is writing a value it doesn't own           |

**When a new option is legitimate**: different games really do want
different values, and none of them is "the bug". A blur radius is a real
option. "Which way is up" isn't. Test: could a user who knows the engine's
conventions have a good reason to pick the non-default value? Also, if the
user can get the variation with one line in their own code (negating a
value, wrapping a callback), don't add an option for it. When you think a
fix needs a new option, ask the user before adding it.

## 4. Delete what the fix made obsolete

Look for code that only existed to work around this bug and remove it in the
same change:

- Options, parameters or fields added by an earlier band-aid fix (like
  `inverted`/`invertX`/`invertY` once the input source normalizes Y).
- Compensating code in callers, demos, e2e fixtures and docs examples
  (`inverted: true` lines, manual negations, "remember to set X" warnings
  in the docs).
- Helpers, constants and tests that only served the removed path. Tests
  that asserted the old wrong behavior should now assert the correct
  behavior, not be kept alongside it.

Run `grep -rn "<old name>" src demo e2e documentation-site/src documentation-site/docs`
for every name you removed or renamed. It should come back empty.

## 5. Review your own diff for bloat

Before running verification, read `git diff` and check for each of these:

- Any new `?:` optional field, `boolean` parameter, or `default*Options`
  entry. Each one needs a better reason than "keeps the old behavior".
- The words `legacy`, `compat`, `deprecated`, `old`, `previous`, `fallback`
  or `backwards` in new code or comments.
- Two code paths that do the same job, where one is the old way.
- A `create*EcsSystem` factory whose `query` or `tags` depend on its
  arguments. System queries are fixed.
- A system that now does a second job, or special-cases some entities, so
  that another system doesn't have to change.
- Net line count. A root-cause fix plus deleted workarounds is often net
  negative in `/src`. If yours grew a lot, check whether you patched the
  symptom instead of the cause.

## 6. Changelog and docs

- Add one bullet under `## [Unreleased]` in `/CHANGELOG.md` (see AGENTS.md's
  "Changelog" section). Use `#### Fixed` when behavior changed but no
  signature did. When the public API changed (an option removed, a
  signature or default changed), use `#### Changed` (or `#### Removed`) and
  say in the same bullet what consumers have to change. E.g. "Gamepad stick
  Y axes now report up as positive, matching the keyboard and world space.
  `GamepadAxis1dBinding`'s `inverted` and `GamepadAxis2dBinding`'s
  `invertX`/`invertY` options are removed. Delete them from your bindings,
  and negate the action's value in game code if you want inverted
  controls". No migration guide and no deprecation period.
- Update the matching page under `documentation-site/docs/docs` so it
  describes the new behavior as the only behavior. Don't write "previously
  ..." or "since version ..." sections in the guides; that history goes in
  the changelog.

## 7. Verify

Run the full checklist in `CLAUDE.md`'s "Verification" section, including
the demo build and browser check whenever the module you touched has a
demo. Use a `fix(<scope>): ...` PR title, even when the fix removed or
changed public API. The changelog bullet is where the breaking change gets
announced.
