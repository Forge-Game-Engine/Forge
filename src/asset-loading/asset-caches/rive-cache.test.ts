/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RiveCache } from './rive-cache';
import Rive from '@rive-app/webgl2';

vi.mock('@rive-app/webgl2', () => {
  return {
    RiveFile: vi.fn().mockImplementation(({ src, onLoad, onLoadError }) => {
      return {
        _onLoadCallback: onLoad as () => void,
        _onLoadErrorCallback: onLoadError as (error: Error) => void,
        _src: src as string,
        init: vi.fn(),
      };
    }),
  };
});

describe('RiveCache', () => {
  let riveCache: RiveCache;

  beforeEach(() => {
    riveCache = new RiveCache();
  });

  it('should retrieve a Rive file from the cache', () => {
    const mockRiveFile = {} as unknown as Rive.RiveFile;
    riveCache.assets.set('path/to/file.riv', mockRiveFile);

    const retrievedFile = riveCache.get('path/to/file.riv');

    expect(retrievedFile).toBe(mockRiveFile);
  });

  it('should throw an error if the Rive file is not found in the cache', () => {
    expect(() => riveCache.get('path/to/nonexistent.riv')).toThrow(
      'Rive file with path "path/to/nonexistent.riv" not found in store.',
    );
  });
});
