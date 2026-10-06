---
name: document-feature
description: Write or update technical documentation in documentation-site/docs/docs for a Forge concept (a component, system, class, module or ECS mechanism). Produces correct, literal, to-the-point reference prose that documents one concept in isolation, with no flowery language, no sales pitch, no game- or demo-specific detail and no asides about other concepts. Also makes sure the public API has JSDoc for the generated API reference. Use whenever writing or editing any page or section under documentation-site/docs/docs, including JSDoc prose that ends up in the API reference.
---

# Write technical documentation

A guide page under `documentation-site/docs/docs/` explains one concept: what
it is, how to use it, and how it behaves. It sits next to the generated API
reference (`documentation-site/docs/api/`, built by typedoc from JSDoc, never
hand-edited), so it doesn't restate signatures.

The bar is **correct, to the point, technical**. Every sentence states a fact
about the concept that a reader needs in order to use it. Anything else is
removed.

## 1. Learn the concept before writing

- Read the source, the tests (`*.test.ts`) and the JSDoc of the concept you
  are documenting. The tests are the specification of its behavior.
- Write down, for yourself, the facts a user needs: what it is, how to create
  or register it, its options and their defaults, what happens when an option
  is omitted, when it runs or takes effect (order, timing), what it reads and
  writes, what throws, and its limits.
- Every claim in the page must be one of these facts, checked against the
  code. If you can't point to the code or test that makes a sentence true,
  don't write it.

## 2. Ensure JSDoc exists

Every public class, function, property and option needs JSDoc with `@param`,
`@returns` and `@throws` as applicable (see AGENTS.md). The same writing rules
below apply to JSDoc. Fixing a reference entry means fixing the JSDoc in
`/src`; after editing `/src`, run the CLAUDE.md verification steps.

## 3. Writing rules

### Document the concept in isolation

- The page is about one concept. Don't explain neighboring concepts (time,
  input, worlds, rendering, dependency injection, general programming
  practice) or how they interact with this one, unless the concept's own
  behavior can't be stated without them. When the reader needs another
  concept, link its page in one clause; don't summarize it.
- Don't describe a particular game, demo or genre. Examples use generic,
  self-explanatory names. "A round", "the game-over screen", "the star
  catcher" are implementation details of someone's game, not of the engine.
- Don't open with, promote or narrate a demo. A demo is linked, if at all,
  once, where the text refers to a specific piece of its code.
- Don't compare the concept to other engines, earlier versions or
  alternatives. History and rationale belong in `/design` and the changelog.

### Be literal and correct

- State behavior as plain fact in the present tense: "`update` isn't called
  while the run condition returns `false`."
- Use the operation's real name: "is removed", "is not queried", "is set to
  `null`", "runs before". Don't use metaphors or figurative verbs: no
  "gated", "stops them where they are", "hands off", "lives in", "sees",
  "wakes up", "takes care of", "under the hood".
- Describe things as what they are in the ECS model. Systems are stateless:
  they don't pause, resume, stop "where they are" or remember anything.
  Components hold data. A state value doesn't need "setting up"; systems run
  when it changes. Don't attribute state, location, intent or feelings to
  code.
- No marketing or filler: no "powerful", "seamless", "simply", "just",
  "easily", "elegant", "out of the box", "puts it all together", no
  rhetorical questions, no exclamations, no "Note that" or "It's worth
  mentioning". Don't vouch for quality ("handles this gracefully").
- No en-dashes or em-dashes.

### Be to the point

- Open with one or two sentences that define the concept in technical terms:
  what it is and what it does. No scene-setting, no list of what the page
  will cover.
- One fact per sentence where possible. Cut a sentence if the reader can use
  the concept correctly without it.
- State defaults and omissions explicitly: what happens when an option, a
  `runIf`, a group or a field is left out.
- State ordering and timing exactly when the concept has any: in which order
  things run, on which tick a change takes effect, what is visible to whom
  and when.
- State error conditions the caller must handle or avoid.
- Don't add an example for something that isn't specific to the concept
  (passing a value to a factory, importing a module, writing a lambda).

### Examples

- Minimal: only the code needed to show the concept, with real imports from
  the published package path (`@forge-game-engine/forge/<module>`, no
  relative paths, no `.js`).
- Names say what the value is: `gameState` and `GameStateName`, not `screen`
  and `Screen`; `enemy`, not `star`.
- Show the call, then state its effect in prose. Don't narrate the example
  line by line.
- A "don't do this" example is allowed only for a misuse of this concept's
  own API that compiles and silently does the wrong thing. Show it, say what
  goes wrong, show the fix.

### What never goes in a page

- Full signatures, parameter lists, property lists or method-by-method
  walkthroughs (link the API reference:
  `[RigidBody](/Forge/docs/api/classes/RigidBody)`).
- Implementation narration: internal data structures, caching, how errors
  are produced.
- Content about another concept (see "in isolation" above).
- A "Guides in this section" list on an `index.md` (the sidebar lists them).

## 4. Page structure

1. `# Title`: the concept's name in Title Case (`# Game States`,
   `# Run Conditions`), not a use-case slogan.
2. Definition: one or two sentences.
3. One `##` section per thing the reader does, in the order they do it:
   create it, use it, configure it. Each section states the rule, shows a
   minimal example, then states the resulting behavior (order, timing,
   defaults, errors).
4. Constraints and limits, if any, in their own section.

Sections that don't apply are left out. A short page is fine.

## 5. Final pass

Read the page sentence by sentence and delete or rewrite each one that fails
any of these:

- **True?** You've checked it against the code or tests.
- **About this concept?** Not about time, input, worlds, a demo or a game.
- **Literal?** No metaphor, personification or adjective that judges quality.
- **Needed?** A reader can't use the concept correctly without it.
- **Precise?** Names the exact API, value, order or condition.

## 6. Mechanics

### Location

Pages live at `documentation-site/docs/docs/<module>/<topic>.md`, where
`<module>` matches the `/src/<module>` folder name. Add a section to an
existing page when the concept is part of one already documented there
(e.g. run conditions in `ecs/system.md`). A new module folder gets a
`_category_.json` and an `index.md`.

### Page conventions

- Optional frontmatter `sidebar_position: N` orders pages within a folder;
  pick a number after the existing siblings.
- Cross-link guide pages with relative markdown links
  (`[World](../ecs/world.md)`), and API reference and demo pages with the
  `/Forge` base URL (`/Forge/docs/api/...`, `/Forge/demos/...`).

### `_category_.json`

With an `index.md` overview page:

```json
{
  "label": "<Display Name>",
  "position": <N>,
  "link": { "type": "doc", "id": "docs/<module>/index" }
}
```

Without one:

```json
{
  "label": "<Display Name>",
  "position": <N>
}
```

Pick a `position` that no sibling `_category_.json` under
`documentation-site/docs/docs/` uses.

### Verify

- `npx prettier --check` and `npm run cspell` on the changed files.
- From `documentation-site/`, `npm run build`: it fails on broken links.
- `npm run start` and open the page: it renders and sits in the right place
  in the sidebar.
- If `/src` was edited, run the full CLAUDE.md verification suite.
