# CLAUDE.md

@AGENTS.md

## Ground rules

These override habits from other codebases. AGENTS.md's "Change Philosophy"
section has the reasoning.

- **No backwards compatibility.** Forge is pre-1.0. When behavior or an API
  is wrong, change it and update every caller, doc and demo in the same
  change. Never add deprecated aliases, compatibility wrappers, fallback
  code paths or "legacy" modes.
- **No option bloat.** Don't add a boolean or option to switch between the
  old and new behavior, or to correct a wrong default. Fix the default.
  Only add an option when different games really need different values,
  and ask first if you're unsure.
- **Fix root causes.** Correct the layer that breaks the engine's
  conventions (Y-up, CSS vs. device pixels, premultiplied alpha, ...), so
  callers don't have to compensate.
- **Prefer deleting.** A fix that makes a workaround unnecessary also
  removes the workaround.
- **General-purpose only.** Game- or genre-specific code doesn't belong in
  `/src`.

## Skills

Project skills live in `.claude/skills/`. Use the matching one before you
start the task:

| Task                                                       | Skill                    |
| ---------------------------------------------------------- | ------------------------ |
| Fixing a bug, defect, regression or wrong behavior         | `fix-defect`             |
| Adding an ECS component                                    | `create-component`       |
| Adding a major feature (needs a docs-site demo)            | `add-feature-demo`       |
| Writing or updating a guide in `documentation-site/docs`   | `document-feature`       |
| Adding a Playwright test for rendering, input or game loop | `write-e2e-test`         |
| Designing or planning a new feature or large change        | `create-design-document` |

## Verification

Before marking any task complete, run these in order:

1. `npm run check-types`: must pass with 0 errors.
2. `npm test`: all tests must pass.
3. `npm run lint`: must pass with 0 errors.
4. `npm run cspell`: must pass with 0 errors.
5. `npm run check-exports`: must pass.
6. If a public API was added or changed, make sure the module's `index.ts`
   exports it.
7. If a new module was created, add it to `/src/index.ts` and the
   `package.json` `exports`.
8. Update the pages under `/documentation-site/docs/docs` that cover what
   you changed, so they describe the engine's current behavior. While the
   engine is below `1.0.0`, don't write upgrade guides. Only touch the
   documentation for this change.
9. If the change touches a `/src` module that has a demo under
   `/documentation-site/src/pages/demos` (check with e.g.
   `grep -rl "/physics" documentation-site/src/pages/demos`):
   - update the demo's code if the change altered an API it uses,
   - run `npm run build` from the repo root (demos use the built `/dist`
     through a `file:..` dependency, never `/src`, so steps 1-2 don't catch
     a broken demo),
   - from `documentation-site/`, run `npm run typecheck` and
     `npm run build`,
   - run `npm run start` and load the affected demo page(s) in a browser to
     confirm they still render and behave correctly.

   AGENTS.md's "Documentation Site Demos" section explains why.

10. If the change's Conventional Commits type is release-note-worthy (not
    `chore`, `style`, `refactor`, `test`, `ci`, `docs` or `build`), add a
    bullet under `## [Unreleased]` in `/CHANGELOG.md`, in the matching Keep
    a Changelog category. When a change breaks the public API, the same
    bullet says what consumers need to change. AGENTS.md's "Changelog"
    section covers the format, what CI enforces, and what never to edit by
    hand.
11. Keep `/AGENTS.md` and the skills in `.claude/skills/` up to date when
    the conventions they describe change.
