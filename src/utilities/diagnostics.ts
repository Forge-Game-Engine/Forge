import { ParameterizedForgeEvent } from '../events/parameterized-forge-event.js';

/**
 * How serious a {@link ForgeDiagnostic} is: a `'warning'` is something the
 * engine worked around, an `'error'` is something that failed.
 */
export type ForgeDiagnosticSeverity = 'warning' | 'error';

/**
 * A problem the engine reports without stopping the caller, such as a
 * condition it works around every frame or a failure in an asynchronous
 * task. Raised through a {@link Diagnostics}.
 */
export interface ForgeDiagnostic {
  /**
   * A stable identifier for the kind of problem, e.g.
   * `'geometry-attribute-not-found'`. Games can route or filter by it.
   */
  readonly code: string;

  /** Whether it's a warning or an error. */
  readonly severity: ForgeDiagnosticSeverity;

  /** A human-readable description. */
  readonly message: string;

  /** The entity the problem is about, if any. */
  readonly entity?: number;

  /** The URL of the asset the problem is about, if any. */
  readonly assetUrl?: string;

  /** Any other name the problem is about, if any, e.g. a shader attribute. */
  readonly label?: string;
}

/**
 * The fields of a {@link ForgeDiagnostic} given to `Diagnostics.warn` and
 * `Diagnostics.error`, which set `severity` themselves.
 */
export type ForgeDiagnosticReport = Omit<ForgeDiagnostic, 'severity'>;

/**
 * The one channel the engine reports warnings and errors through when they
 * don't stop the caller. A game listens to `onWarning` and `onError` to
 * route them to its own telemetry; while nothing listens to one, its
 * diagnostics are written to the console instead.
 *
 * Each diagnostic is raised once per code and key (the entity, asset URL or
 * label it names), so a condition that recurs every frame reports once.
 * `createGame` creates one and passes it to the world and the render
 * context.
 */
export class Diagnostics {
  /** Raised with each warning, the first time its code and key are reported. */
  public readonly onWarning: ParameterizedForgeEvent<ForgeDiagnostic>;

  /** Raised with each error, the first time its code and key are reported. */
  public readonly onError: ParameterizedForgeEvent<ForgeDiagnostic>;

  private readonly _reported: Set<string>;

  constructor() {
    this.onWarning = new ParameterizedForgeEvent('diagnostics.onWarning');
    this.onError = new ParameterizedForgeEvent('diagnostics.onError');
    this._reported = new Set();
  }

  /**
   * Reports a warning: something the engine worked around.
   * @param report - The warning's code, message and what it's about.
   */
  public warn(report: ForgeDiagnosticReport): void {
    this.report({ ...report, severity: 'warning' });
  }

  /**
   * Reports an error: something that failed without stopping the caller.
   * @param report - The error's code, message and what it's about.
   */
  public error(report: ForgeDiagnosticReport): void {
    this.report({ ...report, severity: 'error' });
  }

  /**
   * Raises `diagnostic` through `onWarning` or `onError`, by its severity,
   * or writes it to the console when nothing listens to that event. Does
   * nothing if a diagnostic with the same code and key was reported before.
   * @param diagnostic - The diagnostic.
   */
  public report(diagnostic: ForgeDiagnostic): void {
    const key = [
      diagnostic.code,
      diagnostic.entity ?? '',
      diagnostic.assetUrl ?? '',
      diagnostic.label ?? '',
    ].join('\u0000');

    if (this._reported.has(key)) {
      return;
    }

    this._reported.add(key);

    const isError = diagnostic.severity === 'error';
    const event = isError ? this.onError : this.onWarning;

    if (event.listeners.length > 0) {
      event.raise(diagnostic);

      return;
    }

    const log = isError ? console.error : console.warn;

    log(`[${diagnostic.code}] ${diagnostic.message}`, diagnostic);
  }
}
