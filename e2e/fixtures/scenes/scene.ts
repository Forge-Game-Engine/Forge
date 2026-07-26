/**
 * The contract every fixture scene under `scenes/` must satisfy. `harness.ts`
 * loads a scene by name (the `?scene=` query param) and assigns its handle to
 * `window.__forgeTestHooks`, which specs then drive via `page.evaluate`.
 *
 * A scene builds a minimal, self-contained world directly against `/src` (no
 * dependency on `/demo` or `/documentation-site`) and exposes just enough of
 * its internals for a spec to assert against. Individual scenes may return a
 * handle that extends this with extra fields (see `camera-pan-zoom.ts`).
 */
export interface SceneHandle {
  /**
   * Advances the scene by exactly one frame, without relying on
   * `requestAnimationFrame`/wall-clock time, so specs get deterministic,
   * flake-free frame stepping.
   * @param deltaMilliseconds - The simulated time this step advances by.
   */
  step(deltaMilliseconds?: number): void;
}

/**
 * A scene module's required export, dynamically loaded by `harness.ts`.
 * May be async (for example to wait on a generated texture) - `harness.ts`
 * awaits the result either way.
 */
export type CreateScene = (
  container: HTMLElement,
) => SceneHandle | Promise<SceneHandle>;
