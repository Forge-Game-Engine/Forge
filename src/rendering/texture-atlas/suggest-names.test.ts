import { describe, expect, it } from 'vitest';
import { suggestNames } from './suggest-names.js';

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
