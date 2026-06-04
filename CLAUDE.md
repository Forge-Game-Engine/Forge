# CLAUDE.md

@AGENTS.md

## Verification

Before marking any task complete, always run these in order:

1. `npm run check-types` — must pass with 0 errors
2. `npm test` — all tests must pass
3. `npm run lint` — must pass with 0 errors
4. If a public API was added or changed, ensure the module's `index.ts` exports it
5. If a new module was created, add it to `/src/index.ts` and `package.json` exports
