## Summary

<!-- Describe what this change does and why. -->

## Related issue(s)

<!-- e.g. Closes #123 -->

## Verification checklist

<!-- See CONTRIBUTING.md and CLAUDE.md for details on each step. -->

- [ ] `npm run check-types` passes with 0 errors
- [ ] `npm test` passes
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run cspell` passes with 0 errors
- [ ] `npm run check-exports` passes
- [ ] Any new/changed public API is exported from the module's `index.ts`
      (and `/src/index.ts` / `package.json` `exports` if it's a new module)
- [ ] Documentation under `/documentation-site/docs/docs` is updated if this
      change affects documented behavior
- [ ] If this change touches a module with a demo under
      `/documentation-site/src/pages/demos`, the demo has been updated and
      verified (see AGENTS.md's "Documentation Site Demos" section)

## Changelog

- [ ] A bullet has been added under `## [Unreleased]` in `CHANGELOG.md`
      (required unless this PR's Conventional Commits type is `chore`,
      `style`, `refactor`, `test`, `ci`, `docs`, or `build` — see
      AGENTS.md's "Changelog" section)
