---
name: document-feature
description: Write or update a conceptual guide page in documentation-site/docs/docs for a new or changed Forge feature, focused on practical usage (common use cases, gotchas, performance notes, code smells to avoid) rather than restating the API surface. Also makes sure the public API has JSDoc for the auto-generated API reference. Use when a component, system, class, or module has been added or changed and needs user-facing documentation.
---

# Document a feature

Produces a handwritten guide page under `documentation-site/docs/docs/`.
These guides are a practical companion to the auto-generated API reference
(`documentation-site/docs/api/`, gitignored, built by typedoc from source
JSDoc), not a restatement of it. Never hand-edit anything under `docs/api/`,
fix the JSDoc in `/src` instead.

## 1. Scope the feature

- Find what changed: `git diff main...HEAD --stat` (or ask the user) to find
  the relevant `/src/<module>` directory.
- Read the tests (`*.test.ts`) and any usage in `/demo`. This is where the
  "why" and "how it's actually used" lives, not just the constructor
  signature.
- Check recent commit messages touching this code for context on tradeoffs,
  perf fixes, or bugs that motivated the design. These often become the best
  gotcha and performance notes.

## 2. Ensure JSDoc exists (this feeds the API reference, not the guide)

Per AGENTS.md, every public class/method/property needs a JSDoc comment with
`@param`, `@returns`, `@throws` as applicable. If the new API is missing
JSDoc, add it now, this is what `docs/api/` is generated from. If you edit
`/src`, follow CLAUDE.md verification (`npm run check-types`, `npm test`,
`npm run lint`) before finishing.

The guide page in step 3 should assume this reference exists and link to it
rather than duplicating it.

## 3. What belongs in the guide

The guide's job is to help someone use the feature correctly and avoid
mistakes, not to enumerate its API surface (the generated reference already
does that). Favor:

- **Common use cases**: the problem the feature solves, framed around a
  realistic scenario, e.g. "use `applyForce` for a continuous push like
  wind or thrust, use `applyImpulse` for an instantaneous hit like a
  collision or jump."
- **Gotchas**: non-obvious behavior, ordering requirements (e.g. system
  registration order), units and coordinate conventions, what happens at
  edge values (zero mass, disabled entities, static bodies, etc.).
- **Performance notes**: anything that affects cost at scale, caching
  behavior, when an optimization kicks in or is bypassed, what to avoid
  doing every frame. Mine recent perf-related commits and code comments for
  this.
- **Common mistakes / code smells**: a short "don't do this" example paired
  with "do this instead" and a one-line reason.
- **A realistic worked example**: the feature used in context (inside a
  system, alongside related components), not just a bare constructor call.

### What does NOT belong in the guide

- Full constructor signatures, parameter lists, or return types. Link to the
  API reference instead.
- A "Properties" section that just restates field declarations.
- Method-by-method walkthroughs that mirror the class's public interface.

If you find yourself transcribing JSDoc into the guide, stop, that
information already lives in the generated reference. Link to it using the
site's base URL, following the existing pattern in
`docs/ecs/game.md`:
`[RigidBody](/Forge/docs/api/classes/RigidBody)`,
`[applyForce](/Forge/docs/api/classes/RigidBody#applyforce)`.

## 4. Find or create the guide page

Guide pages live at `documentation-site/docs/docs/<module>/<topic>.md`, where
`<module>` matches the `/src/<module>` folder name (`ecs`, `physics`,
`lifecycle`, `animations`, `common`, `utils`, ...).

- **Module folder already exists** (e.g. `physics/`): add a new
  `kebab-case.md` file for the feature, or extend an existing page if the
  feature is a small addition to a concept already documented there.
- **Module folder doesn't exist yet**: create it with:
  - `_category_.json`
  - `index.md`, short overview of the module (1+ paragraphs, optionally a
    bullet list of "Guides in this section" linking to each page)
  - the new topic page(s)

### Page conventions

- Optional frontmatter `sidebar_position: N` to order pages within a folder
  (used in `ecs`, `lifecycle`, `common`), pick a number after the existing
  siblings.
- `# Title` in Title Case, naming the use case or concept (not necessarily
  the class name), e.g. `# Applying Forces`, not `# RigidBody`.
- Code blocks use ` ```ts ` or ` ```typescript ` and import from the
  **published package path** (no relative paths, no `.js`), e.g.:

  ```ts
  import { RigidBody } from '@forge-game-engine/forge/physics';
  ```

- Cross-link related guide pages with relative markdown links, e.g.
  `[World docs](./world.md)`.
- Do not use any en-dashes or em-dashes.

### `_category_.json` shapes

For a module with an `index.md` overview page:

```json
{
  "label": "<Display Name>",
  "position": <N>,
  "link": { "type": "doc", "id": "docs/<module>/index" }
}
```

For a module without one yet (sidebar lists pages directly):

```json
{
  "label": "<Display Name>",
  "position": <N>
}
```

Check sibling `_category_.json` files under `documentation-site/docs/docs/`
to pick a `position` that doesn't collide.

## 5. Wire it up

- If the module's `index.md` has a "Guides in this section" list, add the
  new page to it.
- Double-check the new page's filename/heading reads sensibly in the
  autogenerated sidebar (`docsSidebar` uses `{ type: 'autogenerated', dirName: '.' }`).

## 6. Verify

- `cd documentation-site && npm run start` and visit the new page, confirm
  it renders, the sidebar entry appears in the right place, and any internal
  links resolve.
- If `/src` was edited in step 2, run the full CLAUDE.md verification suite
  (`npm run check-types`, `npm test`, `npm run lint`) from the repo root.
