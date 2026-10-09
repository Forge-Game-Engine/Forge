import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Diagnostics, ForgeDiagnostic } from './diagnostics.js';

describe('Diagnostics', () => {
  let diagnostics: Diagnostics;
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    diagnostics = new Diagnostics();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    error = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routes warnings to onWarning listeners instead of the console', () => {
    const received: ForgeDiagnostic[] = [];

    diagnostics.onWarning.registerListener((diagnostic) =>
      received.push(diagnostic),
    );
    diagnostics.warn({ code: 'test-warning', message: 'Careful', entity: 3 });

    expect(received).toEqual([
      {
        code: 'test-warning',
        severity: 'warning',
        message: 'Careful',
        entity: 3,
      },
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('routes errors to onError listeners instead of the console', () => {
    const received: ForgeDiagnostic[] = [];

    diagnostics.onError.registerListener((diagnostic) =>
      received.push(diagnostic),
    );
    diagnostics.error({
      code: 'test-error',
      message: 'Failed',
      assetUrl: 'a.png',
    });

    expect(received).toEqual([
      expect.objectContaining({ code: 'test-error', severity: 'error' }),
    ]);
    expect(error).not.toHaveBeenCalled();
  });

  it('writes to the console when nothing listens', () => {
    diagnostics.warn({ code: 'w', message: 'Warned' });
    diagnostics.error({ code: 'e', message: 'Errored' });

    expect(warn).toHaveBeenCalledWith(
      '[w] Warned',
      expect.objectContaining({ severity: 'warning' }),
    );
    expect(error).toHaveBeenCalledWith(
      '[e] Errored',
      expect.objectContaining({ severity: 'error' }),
    );
  });

  it('writes errors to the console when only warnings are listened to', () => {
    diagnostics.onWarning.registerListener(() => {});
    diagnostics.error({ code: 'e', message: 'Errored' });

    expect(error).toHaveBeenCalledTimes(1);
  });

  it('raises a diagnostic once per code and key', () => {
    const received: ForgeDiagnostic[] = [];

    diagnostics.onWarning.registerListener((diagnostic) =>
      received.push(diagnostic),
    );

    for (let frame = 0; frame < 3; frame++) {
      diagnostics.warn({ code: 'missing', message: 'Missing', entity: 1 });
      diagnostics.warn({ code: 'missing', message: 'Missing', entity: 2 });
      diagnostics.warn({ code: 'missing', message: 'Missing', label: 'x' });
      diagnostics.warn({ code: 'other', message: 'Other', entity: 1 });
    }

    expect(
      received.map(({ code, entity, label }) => [code, entity, label]),
    ).toEqual([
      ['missing', 1, undefined],
      ['missing', 2, undefined],
      ['missing', undefined, 'x'],
      ['other', 1, undefined],
    ]);
  });

  it('reports to the console only once per code and key too', () => {
    diagnostics.warn({ code: 'w', message: 'Warned', assetUrl: 'a.png' });
    diagnostics.warn({ code: 'w', message: 'Warned', assetUrl: 'a.png' });
    diagnostics.warn({ code: 'w', message: 'Warned', assetUrl: 'b.png' });

    expect(warn).toHaveBeenCalledTimes(2);
  });
});
