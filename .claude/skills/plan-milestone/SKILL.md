---
name: plan-milestone
description: Turn a GitHub milestone into a set of actionable, correctly cross-referenced issues, each sized for one pull request and grounded in the current code, plus a milestone description (goal, approach, "Done when" checklist) for the maintainer to paste. Use whenever asked to "create issues for milestone N", plan, break down or split a milestone, epic or large feature into issues, write the issues for a milestone, or write or refresh a milestone's description.
---

# Plan a Milestone into Issues

A milestone is a goal. This skill turns it into a series of issues that an
agent or contributor can pick up one at a time, each one a single pull
request with concrete changes and an observable result, created in an order
where every dependency already exists.

The failure modes this skill exists to stop:

- Issues that name files, functions or behavior the engine doesn't have,
  because they were written from the milestone's text instead of the code.
- An issue that is only "verify X" or "test Y". Verification belongs in
  the issue that makes the change.
- `Depends on #N` pointing at the wrong issue, or at a number guessed before
  the issue existed.
- A plan that adds an option to dodge a decision, keeps the old behavior
  alive, or bends a core design, so that every implementing PR inherits the
  problem.

The Path Finding milestone's issues are the model for the result: #775 (the
groundwork issue that creates a module) and #776 (a feature issue that
depends on it). Read them with `gh issue view 775` and `gh issue view 776`
before writing your own.

The repository is `Forge-Game-Engine/Forge`. The commands below use `gh`;
where it isn't available, use the matching GitHub MCP tools
(`issue_read`, `list_issues`, `search_issues`, `issue_write`).

## 1. Read the milestone and what's already there

- Read the milestone itself:
  `gh api repos/Forge-Game-Engine/Forge/milestones/<number>` (title,
  description). Find its number with
  `gh api "repos/Forge-Game-Engine/Forge/milestones?state=all"`.
- Read every issue already in it, open and closed:
  `gh issue list --milestone "<title>" --state all`, then `gh issue view`
  each one. Closed issues say what's done; open ones are work you must not
  duplicate. Extend or reference them instead of writing a second issue for
  the same change.
- Follow the issues and PRs the milestone and those issues link to, and
  search for related ones in other milestones
  (`gh issue list --search "<keyword>" --state all`).

If the milestone's goal is ambiguous (two readings that lead to different
plans), stop and ask the maintainer before planning. Don't pick one
silently.

## 2. Research the code and how other engines do it

Every issue must name real files and describe current behavior, so read the
code the milestone touches before writing anything:

- The `/src` modules it changes, their components, systems and `index.ts`
  exports, and their tests.
- Their callers in `/src`, `/demo`, `/e2e` and `documentation-site`. A
  breaking change has to update all of them, so the issue has to list them.
- The guides under `documentation-site/docs/docs` and any demo under
  `documentation-site/src/pages/demos` that covers the area
  (`grep -rl "/<module>" documentation-site/src/pages/demos`).

Then name the problem in general terms and check how Unity, Godot and Bevy
(or the library the milestone integrates, such as Vite for a template) solve
it. Pick an approach and write down which one and why; it goes in the
issues' `## Goal` or `## Design` and in the milestone description. #775
names Godot's `AStar2D`/`AStarGrid2D` split and the Rust A\* crate Bevy
projects use as the model, which is the level of detail to aim for.

## 3. Check that the plan fits the engine

Measure the plan against AGENTS.md's "Change Philosophy" and CLAUDE.md's
"Ground rules" before splitting it up. In particular:

- **One writer per value.** For each component field the milestone adds or
  changes, name the one system that writes it. If the feature needs a
  second writer of an existing field (e.g. `position.world`), the plan is
  wrong. See AGENTS.md's "Transforms".
- **Fixed queries, stateless systems.** No system in the plan takes options
  that change its `query` or `tags`, and anything a system remembers between
  ticks is in a component (the `create-system` skill says where).
- **No options to dodge a decision.** Don't plan a boolean that switches
  between the old and new behavior, or an option that only corrects a wrong
  default. Choose the right behavior and plan that.
- **Breaking changes outright.** When the milestone changes an API, the
  issue that changes it updates every caller and says what consumers
  change in its changelog bullet. No deprecated aliases, wrappers or legacy
  modes.
- **Delete what's made unnecessary.** If the feature makes a workaround,
  option or helper redundant, the issue that makes it redundant deletes it.
- **General-purpose only.** Game- or genre-specific code doesn't go in
  `/src`. If the milestone asks for some, plan it for a separate package or
  the demo, and say so in the report.
- **The engine's conventions.** Y-up, radians from `+X`, CSS vs. device
  pixels, premultiplied alpha, GPU resources that survive context loss (see
  AGENTS.md's "Common Patterns"). Write the convention into the issue where
  it's easy to get wrong, as #776 does for Y-up grid rows.

For anything architectural (a new module, a new component or system, a
change to how systems share data), run the `solution-reviewer` agent
(`.claude/agents/solution-reviewer.md`) on the plan and act on its verdict.
This doesn't replace the run CLAUDE.md requires before each implementing
PR, so don't add "run solution-reviewer" as a task in the issues.

If the milestone only works by bending a core design, or describes a
relationship that doesn't make sense in an ECS engine, stop and raise it
with the maintainer instead of planning around it.

## 4. Split the work into issues

Order the issues so each one builds on what's merged before it:

1. **Design document**, only when the approach is still open (several
   reasonable designs, or decisions the maintainer should make first). Its
   task is to run the `design-author` agent
   (`.claude/agents/design-author.md`) on the issue, which writes a
   document in `/design`. Later issues may link to that document, but their
   tasks never ask for code comments that cite it, a decision-log entry or
   a phase number (AGENTS.md, "Repository Structure").
2. **Engine groundwork**: new modules, shared utilities, interfaces and
   breaking changes to existing APIs the feature needs.
3. **The feature**, in as many issues as it takes to keep each one a single
   PR.
4. **Integrations** with other modules (physics, rendering, UI, input, the
   CLI or templates).
5. **Demo and feature guide**: one issue that adds the docs-site demo
   (`add-feature-demo`) and the guide that explains the whole feature
   top-down (`document-feature`).

Rules for the split:

- **One PR per issue.** If an issue's tasks can't be reviewed together,
  split it. If two issues can't be merged without each other, merge them.
- **No verification-only issues.** Tests, e2e scenarios and checks go in
  the issue that makes the change they verify.
- **Every issue documents its own change.** CLAUDE.md's verification step 8
  makes each PR update the docs it affects, so each issue's tasks include
  the JSDoc and guide updates for its API. The final issue only adds the
  demo and the feature overview; it is not where every other issue's docs
  go.
- **Shared pieces have one owner.** If another milestone (or an existing
  issue) owns a piece this one needs, depend on that issue by number
  instead of planning it again.

## 5. Write each issue

**Title**: Conventional Commits, `<type>(<scope>): <subject>`, with the
module as the scope (`feat(navigation): add navigation grids for A* on
tile-based levels`). The title becomes the squash-merge commit message and
decides whether CI requires a changelog bullet (AGENTS.md, "Changelog"), so
pick the type the PR will really have.

**Body**, in this order:

```markdown
## Goal

<What this issue achieves and why, in a paragraph. Use `## Problem` instead
when the issue fixes current behavior. Name the files it changes and the
engine or library whose approach it follows.>

Depends on #<number>.

## Design

<Optional. Interfaces, data layout, the conventions it must follow, the
choices made and why. Leave it out when `## Tasks` already says enough.>

## Tasks

- [ ] <A concrete change: the file or API, and what it does.>
- [ ] Unit tests: <the cases that matter, including edge cases>.
- [ ] <An e2e scenario (`write-e2e-test`) when the issue touches rendering,
      input or the game loop.>
- [ ] JSDoc on everything public, and <the guide page under
      `documentation-site/docs/docs` to update>.
- [ ] <Every caller to update, for a breaking change.>
- [ ] A `CHANGELOG.md` bullet <saying what consumers change, if it breaks
      the public API>.

## Done when

<One observable outcome a reviewer can check: what a game can now do, or
what is now true of the engine.>

---

_Generated by [Claude Code](https://claude.ai/code)_
```

Notes:

- Tasks are changes, not activities. "Add `createNavigationGrid(...)`
  returning a `NavigationGrid` that implements `NavigationGraph`" is a task;
  "Investigate grid support" isn't.
- Name the skill or agent a task should use where one applies
  (`create-component`, `create-system`, `write-e2e-test`,
  `document-feature`, `design-author`), so the implementing agent loads it.
- Leave out the changelog task only for types CI doesn't require it for
  (`chore`, `style`, `refactor`, `test`, `ci`, `docs`, `build`).
- Put each dependency on its own `Depends on #N.` line under the goal, and
  only list issues that must merge first.
- End with the attribution footer above whenever an agent writes the issue.

## 6. Create the issues in dependency order

- Create an issue only after every issue it depends on exists, and take
  each number from what `gh issue create` returns. Never write a number you
  expect an issue to get.
- If an issue needs to reference an issue that doesn't exist yet, the split
  or the order is wrong. Restructure so references only point backward.
- Write each body to a file and create the issue with it, so Markdown and
  backticks survive the shell:

  ```bash
  gh issue create --title "<title>" --body-file <file> \
    --milestone "<milestone title>" --label <label>
  ```

  Pick the label from the title's type: `enhancement` for `feat` and
  `perf`, `bug` for `fix`, `refactor` for `refactor`, and `documentation`
  for `docs`. Add the module's label too where one exists (`ecs`,
  `physics`, `rendering`, `audio`).

- Reference issues in other milestones by number (`#766`), not by
  milestone or feature name.

## 7. Re-read every issue

When all of them exist, `gh issue view` each one and check:

- every `#N` points to the issue you meant (open it if unsure),
- no dependency points forward or at an issue outside the plan by mistake,
- the title, milestone and labels are right,
- the files and functions it names exist (or are created by an issue it
  depends on).

Fix mistakes with `gh issue edit <number> --body-file <file>`.

## 8. Write the milestone description

Write or refresh the milestone's description, following the Path Finding
milestone's (read it with
`gh api "repos/Forge-Game-Engine/Forge/milestones?state=all"`):

```markdown
<The goal in one or two sentences: what a game can do once it's done.>

## Approach

- **<Decision>.** <What was chosen, how it fits the engine, and which
  engine or library it mirrors.>

## Done when

- [ ] <An observable outcome>
- [ ] A demo and guide in the documentation site
```

Don't edit the milestone yourself: the maintainer owns its text, and an
agent's token often can't edit milestones. Give the description to the
maintainer to paste.

## 9. Report back

Finish with:

- A table of the issues in creation order: number, title, and the issues it
  depends on.
- The milestone description from step 8.
- The decisions the maintainer might disagree with: breaking changes and
  the callers they touch, anything that differs from the milestone's
  original text, approaches chosen over a reasonable alternative, and work
  left to other milestones or packages.

## Checklist

- [ ] Read the milestone, its open and closed issues, and the code it touches
- [ ] Chose an approach and said which engine or library it follows and why
- [ ] Checked the plan against "Change Philosophy"; ran `solution-reviewer`
      for anything architectural
- [ ] Every issue is one PR, none is verification-only, and each documents
      its own change
- [ ] Every issue has a Conventional Commits title, `## Goal`/`## Problem`,
      `## Tasks`, one `## Done when` outcome and the footer
- [ ] Created in dependency order; every `#N` re-read and correct
- [ ] Milestone description and report given to the maintainer
