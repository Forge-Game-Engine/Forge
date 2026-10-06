---
sidebar_position: 1
---

# Storage

The storage module keeps data that has to outlive the page, such as
settings, achievements and unlocked levels. It has two parts:

- [Persistent state](./persistent-state.md): a named record of numbers,
  strings and booleans with defaults, loaded once and stored on every
  change.
- [Storage backends](./storage-backends.md): where the stored strings are
  kept. The module has a `localStorage` backend and a memory backend, and a
  game can implement its own.

Everything is imported from `@forge-game-engine/forge/storage`.
