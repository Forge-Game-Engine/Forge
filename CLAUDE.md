# CLAUDE.md

@AGENTS.md

## Verification

Before marking any task complete, always run these in order:

1. `npm run check-types` — must pass with 0 errors
2. `npm test` — all tests must pass
3. `npm run lint` — must pass with 0 errors
4. `npm run cspell` — must pass with 0 errors
5. `npm run check-exports` — must pass
6. If a public API was added or changed, ensure the module's `index.ts` exports it
7. If a new module was created, add it to `/src/index.ts` and `package.json` exports
8. Ensure that documentation located a `/documentation-site/docs/docs` are updated appropriately based on the changes made. So long as the engine version is < `1.0.0` not upgrade guides are required. Just simply change the documentation so that it accurately reflects the behavior of the engine. Only update the documentation that corresponds to the changes made in this session.
9. If the change touches a `/src` module that has a demo under `/documentation-site/src/pages/demos` (check with e.g. `grep -rl "/physics" documentation-site/src/pages/demos`): update the demo's code if the change altered an API it depends on, run `npm run build` from the repo root (demos consume the built `/dist` output via a `file:..` dependency, never `/src`, so steps 1-2 above do not catch demo breakage), then from `documentation-site/` run `npm run typecheck` and `npm run build`, and finally run `npm run start` and actually load the affected demo page(s) in a browser to confirm they still render and behave correctly. See AGENTS.md's "Documentation Site Demos" section for why this is necessary.
10. If the change's Conventional Commits type is release-note-worthy (i.e. not `chore`, `style`, `refactor`, `test`, `ci`, `docs`, or `build`), add a bullet under `## [Unreleased]` in `/CHANGELOG.md`, in the matching Keep a Changelog category. See AGENTS.md's "Changelog" section for the format, what's CI-enforced, and what must never be hand-edited.
11. Keep the `/AGENTS.md` file up to date.
