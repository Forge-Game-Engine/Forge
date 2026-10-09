---
name: add-feature-demo
description: Use this skill when adding a new feature to the engine.
---

# Add a Demo

`documentation-site/src/pages/demos/<name>/` holds interactive, in-browser
demos of engine features, each rendered through `DemoPage`
(`documentation-site/src/components/demo-page/`). Read `AGENTS.md`'s
"Documentation Site Demos" section first for the `file:..`/`dist` gotcha
that governs how demos are verified — it applies to every demo, new or
existing.

## 1. Decide whether this change needs one

**Every new major feature gets a demo.** A major feature is a new `/src`
module (a new top-level directory under `/src` with its own `package.json`
export, e.g. `physics`, `particles`), or a substantial new capability added
to an existing module that a user couldn't do before.

Skip a new demo for:

- Bug fixes, performance improvements, or refactors to something an
  existing demo already exercises — that demo continues to cover it (though
  see step 5 if the change altered the demo's API surface).
- Internal-only APIs with no visible behavior.
- A small option/parameter added to an already-demoed feature — extend the
  existing demo instead of creating a new one, unless the option is
  significant enough to need its own dedicated scene to be legible.

If genuinely unsure whether a change counts as "major," ask the user rather
than guessing.

## 2. Pick a name and scaffold the directory

Directory: `documentation-site/src/pages/demos/<kebab-case-name>/`. Name it
after the feature being shown (`physics`, `nine-slice`,
`texture-filtering`), not the visual theme, unless the feature has no
better handle than its visual (`newtons-cradle`, `wrecking-ball` for
specific physics-joint showcases — precedent exists for both styles, prefer
the feature name when one exists).

Follow the existing file split, every demo uses the same shape:

- `_create-game.ts` — exports `create<PascalName>Game(): Promise<Game>`,
  built from `createGame` (`@forge-game-engine/forge/utilities`), sets up a
  camera via `createCamera(world, { verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS })`
  (`@site/src/utils/demo-camera`) — every demo shares this constant so
  world-unit sizes stay visually consistent across the fixed-height,
  non-fullscreen demo box (see the comment in `demo-camera.ts`) —
  registers whatever ECS systems the feature needs, and returns the `Game`.
- One `_<thing>.ts` / `_<thing>.component.ts` / `_<thing>.system.ts` file
  per logical piece (entity creation, a demo-only component/system used
  only to drive the showcase, boundary/scene setup), imported into
  `_create-game.ts`. Split by concern the same way `physics/` splits
  `_create-boundaries.ts` from `_spawn-shapes.ts`, not into one monolithic
  file — each file also becomes its own tab in the demo's code viewer (see
  step 3).
- `index.tsx` — the page itself, a thin wrapper around `<DemoPage>` (see
  step 3).

Demo-only components/systems (input handling for interaction, camera
follow, reset-on-key, etc.) still follow the engine's own component/system
pattern (`create-component` skill) — they just live in the demo directory
instead of `/src` because they're not part of the public API.

## 3. Write `index.tsx`

```tsx
import React, { JSX } from 'react';
import { create<PascalName>Game } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import thingSystemCode from '!!raw-loader!./_thing.system';

import { DemoPage } from '@site/src/components/demo-page';

export default function <PascalName>(): JSX.Element {
  return (
    <DemoPage
      slug="<kebab-case-name>"
      createGame={create<PascalName>Game}
      controls={[
        { inputs: ['←', 'A'], action: 'Move left' },
        { inputs: [{ device: 'mouse', label: 'Click' }], action: 'Select' },
      ]}
      highlights={[
        {
          text: '<One short sentence on what the engine does here.>',
          file: 'thing.system.ts',
        },
      ]}
      docLinks={[{ label: '<Guide>', to: '/docs/docs/<module>/<page>' }]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary: '<One sentence on what the file does.>',
              content: gameCode,
            },
          ],
        },
        {
          title: '<Feature>',
          files: [
            {
              name: 'thing.system.ts',
              summary: '<One sentence.>',
              content: thingSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
```

The page's title and one-line summary come from the demo's entry in
`documentation-site/src/data/demos.ts` (step 4), so the catalogue card and
the page always agree. Write the rest for a reader who has never seen the
feature:

- `controls`: one row per action, with alternative inputs in the same
  row. Check each binding against the demo's input code. Leave it out for
  a demo you only watch.
- `highlights`: 3-5 "How it works" points, one short sentence each, each
  linked to the file that implements it. Clicking the link opens that file
  in the code explorer.
- `docLinks`: the guides under `documentation-site/docs/docs` that cover
  the feature (`/docs/docs/<path>`, a folder's `index.md` is
  `/docs/docs/<folder>`).
- `fileGroups`: every demo-source file a reader needs, grouped by purpose,
  with `create-game.ts` alone under "Start here". Name each after its
  source file without the leading underscore, and keep the
  `.component.ts`/`.system.ts` suffixes: the explorer's type icons and
  filter come from them. Import each via `!!raw-loader!` exactly like
  `gameCode`, which pulls in the raw source text at build time.

If the demo needs something else beside the game, such as live settings (a
slider, a toggle) or a legend for colors in the scene, pass it as `panels`,
wrapped in `DemoPanel` (with `DemoLegend` for a legend). See
`ui-anchors/index.tsx` and `easing-functions/index.tsx`.

## 4. Add it to the demo catalogue

Add an entry to `documentation-site/src/data/demos.ts` with the demo's
`slug` (its directory name), `title`, a one-sentence `description` (what
you see or do, and which feature it shows; it's the page's summary too) and
the category slugs it belongs to. See AGENTS.md's "Demo Catalogue and
Categories" section.

## 5. Verify

This is a `/documentation-site` change consuming the engine through its
published `file:..` package (resolved from `/dist`, not `/src`), so the
root-level `check-types`/`test`/`lint` checks never compile against it. Per
`AGENTS.md`'s "Documentation Site Demos" section and step 9 of `CLAUDE.md`'s
verification checklist:

1. `npm run build` from the repo root, to refresh `/dist` with whatever
   `/src` change motivated the demo (skip only if this demo covers an
   already-built, unchanged API).
2. From `documentation-site/`: `npm run typecheck`, then `npm run build`
   (`docusaurus build`) — this is what actually catches a broken import
   against the published package surface or a broken `docLinks` entry.
3. `npm run start` in `documentation-site/` (or reuse a running dev
   server), open `demos/<kebab-case-name>` in a browser with a full page
   reload (fast refresh doesn't guarantee a clean re-init), and confirm it
   renders and behaves correctly — try every control the page lists and
   open each highlight's file link.
4. Open the demo from its card on `/demos` too, to check the catalogue
   entry.

If this was prompted by a `/src` change (not a brand-new demo for existing
functionality), also re-run the full root-level `CLAUDE.md` verification
suite for that change, and check whether any _other_ existing demo imports
the module you changed (`grep -rl "/<module>" documentation-site/src/pages/demos`)
— an altered API can silently break a demo that already covered it even
when this task is about adding a different, new one.
