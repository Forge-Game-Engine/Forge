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

Forge is pre-1.0 and doesn't keep backwards compatibility. When fixing a bug,
change the behavior outright rather than adding an option, deprecated alias
or fallback that preserves the old behavior. See AGENTS.md's
[Change Philosophy](./AGENTS.md#change-philosophy).

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

When a pull request opens (or a draft is marked ready for review), Claude
Code reviews it with the `pr-reviewer` agent
(`.github/workflows/claude-pr-review.yml`) and posts a checklist comment:
one writer per value, fixed system queries, no compatibility shims, the
changelog entry, and updated docs and demos. It runs once per pull request
and doesn't push, approve or block merging. New commits aren't reviewed
again automatically: run the `pr-reviewer` agent locally (in Claude Code)
to review them. Mentioning `@claude` on the pull request asks Claude to
change it, not to review it.

## Handing an issue to Claude

Maintainers can add the `claude` label to an issue to have Claude Code work
on it (`.github/workflows/claude.yml`). The run branches off `dev` and
follows `CLAUDE.md` and `AGENTS.md`. For a new feature, large change or
refactor whose issue doesn't link a design, it first has the
`design-author` agent write one in `/design` and the `solution-reviewer`
agent review it. It then implements the issue with unit tests, and with
e2e tests (`npm run test:e2e`) for anything touching rendering, input or
the game loop, runs the verification steps, and opens a pull request that
closes the issue, carries the design, and names the docs-site demo pages
you need to check in a browser. It reports progress in a comment on the
issue.

If the design has blocking open questions, or the review rejects it, the
run commits the design on its branch, posts the questions or the verdict
in that comment and stops without opening a pull request. Answer on the
issue and mention `@claude`: the next run picks up that design, updates it
with your answers and carries on. See AGENTS.md's
[Agentic Workflow](./AGENTS.md#agentic-workflow) for every step. The label is removed when the
run ends, so adding it again starts a fresh attempt.

You can label every issue in a milestone at once. A run doesn't start
while an issue on the labeled issue's `Depends on #N` lines is still open:
the issue is relabeled `claude-waiting` with a comment saying what it waits
for, and gets `claude` back, starting its run, once those issues have closed
(`.github/workflows/claude-unblock.yml`). Each labeled issue gets its own
run, and merging an issue starts a run for every issue it unblocks, so
expect that many pull requests to review.

To ask for changes, mention `@claude` in a comment, a review or an inline
review comment on the pull request. Claude pushes the changes to that pull
request's branch. Only one run works on a pull request at a time, so put all
your feedback in one review rather than several separate comments: while a
run is busy, GitHub keeps only the newest waiting request. Mentioning
`@claude` on an issue, for example to answer a question Claude asked there,
starts a run the same way the label does.

See [AGENTS.md](./AGENTS.md) for full details on architecture, coding
conventions, module organization, and testing patterns.
