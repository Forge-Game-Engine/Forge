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
- **Gotchas**: non-obvious behavior the reader's own code must account for,
  e.g. ordering requirements (system registration order), units and
  coordinate conventions, what a lookup returns at edge values (a miss
  returns `undefined` rather than throwing; a disabled entity is skipped).
  The test is whether it changes what code the reader writes, not whether
  it's interesting.
- **Performance notes**: anything that affects cost at scale and changes
  what the reader should do, e.g. "preload up front, not mid-gameplay."
  Mine recent perf-related commits and code comments for this, but state
  the actionable consequence, not the mechanism.
- **Common mistakes / code smells**: a short "don't do this" example paired
  with "do this instead" and a one-line reason.
- **A realistic worked example**: the feature used in context (inside a
  system, alongside related components), not just a bare constructor call.

### Tone: factual, not narrative

Write declarative sentences a reader can scan for the fact they need, not
prose that reassures or editorializes. Cut adjectives/adverbs that describe
quality rather than behavior ("gracefully", "cleanly", "nicely",
"powerful", "simply", "just") — if a sentence still means the same thing
with the adjective removed, remove it. State what happens; don't comment on
how good the way it happens is.

### Document the interface, not the internals

The reader needs to know what the feature does from the outside: inputs,
outputs, return values, when a promise rejects, what triggers a thrown
error. They do not need _how_ it's implemented internally, and they do not
need reassurance about implementation quality:

- Wrong: "`load` rejects with a descriptive error if the JSON is malformed,
  so a broken file never surfaces as a confusing `NaN` downstream." (this
  narrates an internal design decision and vouches for its own quality)
- Right: nothing at all, if the mere fact that malformed input throws isn't
  something the reader has to code around. If it genuinely changes what the
  reader should do (e.g. "wrap `load` in try/catch when the source isn't
  your own build output"), say that specific, actionable thing and stop.

The same applies to caching mechanics, internal data structures, or how an
error is caught and re-thrown: these are implementation facts you likely
learned while building the feature, not things the reader needs.

### Only cross-link genuine is-a relationships

Link to a shared parent concept the feature is a real instance of (a
specific `AssetCache` implementation → the `AssetCache` doc), since the
reader benefits from knowing the general contract once. Do **not** link to
or mention a sibling/adjacent feature just because it's similar, reuses the
same pattern, or was what you read as an implementation reference while
building this one (e.g. don't mention `ImageCache` while documenting a new,
unrelated cache just because you modeled the new cache's code after it).
Citing a sibling assumes the reader already knows that sibling — usually
false — and adds cognitive load for no payoff. Before adding any
cross-reference, ask: would a reader who has never seen the other thing
still get full value from this link? If the answer is "they'd have to go
learn the other thing first," cut it.

### What does NOT belong in the guide

- Full constructor signatures, parameter lists, or return types. Link to the
  API reference instead.
- A "Properties" section that just restates field declarations.
- Method-by-method walkthroughs that mirror the class's public interface.
- Implementation narration: how errors are caught internally, how caching
  is implemented under the hood, why an internal design choice was made.
- A "Guides in this section" list on a module's `index.md` if the sidebar
  nav already lists those same pages — it's pure duplication.
- Reassurance that the engine does its job well ("fails descriptively",
  "handles this gracefully"). State the observable behavior; skip the
  editorializing about how well it's done.

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
  - `index.md`, a short overview of the module (1+ paragraphs). Don't add a
    "Guides in this section" list of links to the other pages in the
    folder — the sidebar nav already lists them; a manual list is pure
    duplication that goes stale the moment a page is renamed.
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

- Double-check the new page's filename/heading reads sensibly in the
  autogenerated sidebar (`docsSidebar` uses `{ type: 'autogenerated', dirName: '.' }`).

## 6. Verify

- `cd documentation-site && npm run start` and visit the new page, confirm
  it renders, the sidebar entry appears in the right place, and any internal
  links resolve.
- If `/src` was edited in step 2, run the full CLAUDE.md verification suite
  (`npm run check-types`, `npm test`, `npm run lint`) from the repo root.
