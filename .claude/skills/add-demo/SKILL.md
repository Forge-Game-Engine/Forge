---
name: add-demo
description: Decide whether a change needs a new interactive demo under documentation-site/src/pages/demos, and if so scaffold and wire it up (page, navbar dropdown entry, code-viewer files). Use when adding a new major engine feature or module, or when explicitly asked to add a demo.
---

# Add a Demo

`documentation-site/src/pages/demos/<name>/` holds interactive, in-browser
demos of engine features, each rendered through
`documentation-site/src/components/Demo.tsx`. Read `AGENTS.md`'s
"Documentation Site Demos" section first for the `file:..`/`dist` gotcha
that governs how demos are verified — it applies to every demo, new or
existing.

## 1. Decide whether this change needs one

**Every new major feature gets a demo.** A major feature is a new `/src`
module (a new top-level directory under `/src` with its own `package.json`
export, e.g. `physics`, `particles`), or a substantial new capability added
to an existing module that a user couldn't do before (a new joint type, a
new rendering effect, a new component category with its own systems) —
the kind of thing that gets its own line in `CHANGELOG.md`'s `#### Added`,
not a `#### Fixed` or `#### Changed` tweak to something already
demonstrated.

Skip a new demo for:

- Bug fixes, performance improvements, or refactors to something an
  existing demo already exercises — that demo continues to cover it (though
  see step 5 if the change altered the demo's API surface).
- Internal-only APIs with no visible behavior (a new utility function, a
  type export, an ECS plumbing change) — nothing to show on a canvas.
- A small option/parameter added to an already-demoed feature — extend the
  existing demo instead of creating a new one, unless the option is
  significant enough to need its own dedicated scene to be legible (compare
  how `revolute-joint`, `prismatic-joint`, and `torque` are three separate
  physics demos rather than one crowded one).

If genuinely unsure whether a change counts as "major," ask the user rather
than guessing — an unwanted demo is wasted scaffolding, a missing one is a
silent documentation gap.

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
- `index.tsx` — the page itself, a thin wrapper around `<Demo>` (see step
  3).

Demo-only components/systems (input handling for interaction, camera
follow, reset-on-key, etc.) still follow the engine's own component/system
pattern (`create-component` skill) — they just live in the demo directory
instead of `/src` because they're not part of the public API.

## 3. Write `index.tsx`

```tsx
import React, { JSX } from 'react';
import { create<PascalName>Game } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import someOtherCode from '!!raw-loader!./_some-other-file';

import { Demo } from '@site/src/components/Demo';

export default function <PascalName>(): JSX.Element {
  return (
    <Demo
      metaData={{
        title: '<Human Title> Demo',
        description: 'A demo showcasing <what it shows>.',
      }}
      header="<Human Title>"
      blurb="<1-3 sentences: what the demo shows, what the engine feature
        does, and how to interact with it (click/drag/keys) if applicable.>"
      createGame={create<PascalName>Game}
      codeFiles={[
        { name: 'game.ts', content: gameCode },
        { name: 'some-other-file.ts', content: someOtherCode },
      ]}
    />
  );
}
```

Each `codeFiles` entry drives one tab in the demo's live code viewer, so
list every demo-source file the reader would need to fully understand the
scene, in the order that makes it easiest to follow (usually `game.ts`
first, since it's the entry point). Import each via `!!raw-loader!` exactly
like `gameCode` — this is what pulls the raw source text in at build time,
not the compiled/imported binding.

If the demo needs live interaction controls beyond canvas input (a slider,
a toggle button), pass a React node via `interactions` — see
`space-shooter/index.tsx` and `_BloomControls.tsx` for the pattern of a
small controls component alongside the demo files.

## 4. Wire it into the navbar

Add an entry to the `Demos` dropdown in
`documentation-site/docusaurus.config.ts` (currently around line 114),
alphabetical-ish grouping isn't strictly enforced but new entries are
generally added near thematically similar ones (physics demos are grouped
together, etc.):

```typescript
{
  to: 'demos/<kebab-case-name>',
  label: '<Human Label>',
},
```

This is the only place demos are registered/linked — there's no separate
index page or sidebar to update.

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
   against the published package surface or an MDX/broken-link error from
   the navbar entry.
3. `npm run start` in `documentation-site/` (or reuse a running dev
   server), open `demos/<kebab-case-name>` in a browser with a full page
   reload (fast refresh doesn't guarantee a clean re-init), and confirm it
   renders and behaves correctly — click through any interactions the
   `blurb` describes.

If this was prompted by a `/src` change (not a brand-new demo for existing
functionality), also re-run the full root-level `CLAUDE.md` verification
suite for that change, and check whether any *other* existing demo imports
the module you changed (`grep -rl "/<module>" documentation-site/src/pages/demos`)
— an altered API can silently break a demo that already covered it even
when this task is about adding a different, new one.
