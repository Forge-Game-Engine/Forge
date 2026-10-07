---
sidebar_position: 3
---

# Storage Backends

A [`StorageBackend`](/Forge/docs/api/interfaces/StorageBackend) stores
strings under keys. Persistent state stores its records through one, and a
game can swap the backend without changing the code that uses the records.

## Backends in the engine

- [`createLocalStorageBackend`](/Forge/docs/api/functions/createLocalStorageBackend)
  stores strings in the browser's `localStorage`. Each method does its work
  before it returns, so a write is stored even if the page closes straight
  after. It's the default backend of `createPersistentState`.
- [`createMemoryStorageBackend`](/Forge/docs/api/functions/createMemoryStorageBackend)
  keeps strings in memory, so they're lost when the page closes. Each
  memory backend has its own strings. Use it in tests, or to carry on
  without storage.

```ts
import {
  createMemoryStorageBackend,
  createPersistentState,
} from '@forge-game-engine/forge/storage';

const settings = await createPersistentState(
  'my-game.settings',
  { quality: 'high' },
  { storage: createMemoryStorageBackend() },
);
```

## Storage errors

A backend rejects with a [`StorageError`](/Forge/docs/api/classes/StorageError)
when storage fails. The error that caused it is its `cause`. The
`localStorage` backend rejects with one of its subclasses:

- [`StorageUnavailableError`](/Forge/docs/api/classes/StorageUnavailableError):
  there's no `localStorage` in this environment.
- [`StorageBlockedError`](/Forge/docs/api/classes/StorageBlockedError):
  `localStorage` is blocked, by the browser's settings, a frame that's
  denied storage, or private browsing.
- [`StorageFullError`](/Forge/docs/api/classes/StorageFullError):
  `localStorage` is full.

Any other `Error` is rejected with as it is.

## Implementing a backend

A backend is an object with three methods, each returning a promise:

```ts
import {
  StorageBackend,
  StorageError,
  StorageUnavailableError,
} from '@forge-game-engine/forge/storage';

const createRemoteStorageBackend = (baseUrl: string): StorageBackend => ({
  get: async (key) => {
    const response = await fetchOrThrow(`${baseUrl}/${key}`);

    return response.status === 404 ? null : response.text();
  },
  set: async (key, value) => {
    await fetchOrThrow(`${baseUrl}/${key}`, { method: 'PUT', body: value });
  },
  remove: async (key) => {
    await fetchOrThrow(`${baseUrl}/${key}`, { method: 'DELETE' });
  },
});

const fetchOrThrow = async (
  url: string,
  init?: RequestInit,
): Promise<Response> => {
  let response: Response;

  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(5000) });
  } catch (error) {
    throw new StorageUnavailableError(`Unable to reach ${url}.`, error);
  }

  if (!response.ok && response.status !== 404) {
    throw new StorageError(`${url} responded with ${response.status}.`);
  }

  return response;
};
```

Every backend keeps this contract:

- `get` resolves with the stored string, or `null` if nothing is stored
  under the key.
- `remove` resolves once nothing is stored under the key, whether or not
  anything was.
- Every promise settles. A backend that talks to a network applies its own
  timeouts.
- Failures reject with a `StorageError`, with the original error as its
  `cause`.
- Creating the backend touches no storage; only its methods do, so the
  backend can be created where there's no `window`, such as during
  server-side rendering.
