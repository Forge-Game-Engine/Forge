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
9. Keep the `/AGENTS.md` file up to date.
