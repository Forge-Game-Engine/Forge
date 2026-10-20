import { describe, expect, it } from 'vitest';
import {
  describeMissingName,
  describeMissingRegionNames,
  findMissingNames,
  suggestNames,
} from './suggest-names.js';

describe('suggestNames', () => {
  it('suggests names within a small edit distance, nearest first', () => {
    expect(suggestNames('wak', ['run', 'walks', 'walk', 'jump'])).toEqual([
      'walk',
      'walks',
    ]);
  });

  it('ignores case', () => {
    expect(suggestNames('Jump', ['jump'])).toEqual(['jump']);
  });

  it('suggests names that contain the requested name or are contained in it', () => {
    expect(
      suggestNames('explosion', ['explosion_large_effect', 'boom']),
    ).toEqual(['explosion_large_effect']);
    expect(suggestNames('enemy_ship_red', ['ship', 'tree'])).toEqual(['ship']);
  });

  it('allows a larger edit distance for longer names', () => {
    // Three edits apart.
    expect(
      suggestNames('character_talks_lefty', ['character_walk_left']),
    ).toEqual(['character_walk_left']);
  });

  it('suggests at most maxSuggestions names', () => {
    expect(suggestNames('a', ['a1', 'a2', 'a3', 'a4'])).toHaveLength(3);
    expect(suggestNames('a', ['a1', 'a2', 'a3', 'a4'], 2)).toHaveLength(2);
  });

  it('suggests nothing when no name is close', () => {
    expect(suggestNames('spaceship', ['coin', 'gem'])).toEqual([]);
  });
});

describe('describeMissingName', () => {
  it('suggests close names', () => {
    expect(describeMissingName('wak', ['walk', 'run'])).toBe(
      'Did you mean "walk"?',
    );
  });

  it('lists the count and first three names when nothing is close', () => {
    expect(
      describeMissingName('spaceship', ['coin', 'gem', 'heart', 'key']),
    ).toBe('The atlas has 4 regions, named "coin", "gem", "heart", ....');
    expect(describeMissingName('spaceship', ['coin', 'gem'])).toBe(
      'The atlas has 2 regions, named "coin", "gem".',
    );
    expect(describeMissingName('spaceship', ['coin'])).toBe(
      'The atlas has 1 region, named "coin".',
    );
  });

  it('names what is missing', () => {
    expect(describeMissingName('spaceship', ['run'], 'sequence')).toBe(
      'The atlas has 1 sequence, named "run".',
    );
    expect(describeMissingName('spaceship', ['run', 'jump'], 'sequence')).toBe(
      'The atlas has 2 sequences, named "run", "jump".',
    );
  });
});

describe('findMissingNames', () => {
  it('returns each missing name once, in the order they first appear, skipping indices', () => {
    const names = new Set(['run_0', 'run_1']);

    expect(
      findMissingNames(['run_2', 0, 'run_0', 'jump', 'run_2', 5], (name) =>
        names.has(name),
      ),
    ).toEqual(['run_2', 'jump']);
  });
});

describe('describeMissingRegionNames', () => {
  it('describes one missing name', () => {
    expect(describeMissingRegionNames(['wak'], ['walk'])).toBe(
      'the atlas has no region named "wak". Did you mean "walk"?',
    );
  });

  it('describes several missing names, each with its suggestions', () => {
    expect(describeMissingRegionNames(['wak', 'rnu'], ['walk', 'run'])).toBe(
      'the atlas has no regions named "wak", "rnu". "wak": Did you mean "walk"? "rnu": Did you mean "run"?',
    );
  });
});
