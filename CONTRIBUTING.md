# Contributing to Forge

Thanks for your interest in contributing! This guide covers the basics for
getting a change merged. For deeper architectural and coding conventions,
see [AGENTS.md](./AGENTS.md) — it's written for AI coding agents working in
this repo, but it's an equally good reference for human contributors.

## Setup

- Install [Docker](https://www.docker.com/products/docker-desktop/) and
  [VS Code](https://code.visualstudio.com/) (the repo is set up to run in a
  dev container).
- Clone the repository and open it in VS Code:

  ```sh
  git clone https://github.com/forge-game-engine/Forge.git && \
  cd Forge && \
  code .
  ```

- Install dependencies:

  ```sh
  npm install
  ```

- Run the demo app during development:

  ```sh
  npm run dev
  ```

## Making a change

1. Create a branch off `dev`.
2. Make your change, following the conventions in
   [AGENTS.md](./AGENTS.md) (naming, member ordering, component/system
   patterns, etc.).
3. If you added or changed a public API, make sure it's exported from the
   relevant module's `index.ts` (and from `/src/index.ts` /
   `package.json` `exports` for a brand-new module).
4. If your change affects behavior described in `/documentation-site/docs/docs`,
   update the corresponding page.
5. Add a `CHANGELOG.md` entry if required — see below.

## Verification

Before opening a pull request, run the following from the repo root, in
order, and make sure they all pass:

```sh
npm run check-types    # TypeScript, must pass with 0 errors
npm test                # Vitest unit tests, all must pass
npm run lint            # ESLint, must pass with 0 errors
npm run cspell          # spell check, must pass with 0 errors
npm run check-exports   # verifies package.json exports resolve correctly
```

If your change touches code exercised by the Playwright suite under `/e2e`
(rendering, input, the game loop), also run:

```sh
npm run test:e2e
```

The CI workflow (`.github/workflows/ci.yml`) runs all of the above (plus a
production `npm run build`) on every pull request into `dev`, so a failure
here will also fail there.

## Commit messages

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/),
enforced by commitlint via a husky pre-commit hook:

```
<type>(<scope>): <subject>
```

- Allowed types: `feat`, `fix`, `perf`, `docs`, `style`, `refactor`, `test`,
  `build`, `ci`, `chore`.
- The header (the first line) must be 200 characters or fewer.
- Example: `feat(ecs): add component removal event`

Feature branches are squash-merged into `dev`, so your **pull request
title** becomes the permanent commit message and the changelog source —
follow the same format there.

## Changelog

`/CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
If your pull request's Conventional Commits type is anything other than
`chore`, `style`, `refactor`, `test`, `ci`, `docs`, or `build` (i.e. it's a
`feat`, `fix`, `perf`, or similar release-note-worthy change), add a bullet
under the `## [Unreleased]` heading, in the matching Keep a Changelog
category (`#### Added`, `#### Changed`, `#### Deprecated`, `#### Removed`,
`#### Fixed`, `#### Security`). Write it for a consumer of the package, not
as a restatement of the commit message.

This is enforced by CI (`.github/workflows/changelog.yml`): a pull request
whose title isn't an excluded type will fail the `check-changelog` job
unless `CHANGELOG.md` gained a new bullet under `[Unreleased]`.

Don't hand-edit released version sections (`## [x.y.z] - date`) — those are
historical record and are produced by the release process.

## Opening the pull request

- Target the `dev` branch.
- Fill out the pull request template, including the verification checklist
  and changelog checkbox.
- Link any related issue(s).

See [AGENTS.md](./AGENTS.md) for full details on architecture, coding
conventions, module organization, and testing patterns.
