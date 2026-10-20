const editDistance = (a: string, b: string): number => {
  let previousRow = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const row = [i];

    for (let j = 1; j <= b.length; j++) {
      const substitution = previousRow[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);

      row.push(Math.min(previousRow[j] + 1, row[j - 1] + 1, substitution));
    }

    previousRow = row;
  }

  return previousRow[b.length];
};

/**
 * Finds the names closest to one that wasn't found, for "did you mean"
 * error messages: names within a small, case-insensitive edit distance of
 * `requested`, or that contain it or are contained in it.
 * @param requested - The name that wasn't found.
 * @param names - The names that exist.
 * @param maxSuggestions - The most names to return.
 * @returns Up to `maxSuggestions` names, nearest first, or none when
 * nothing is close.
 */
export function suggestNames(
  requested: string,
  names: readonly string[],
  maxSuggestions: number = 3,
): string[] {
  const lowerRequested = requested.toLowerCase();
  const maxDistance = Math.max(2, Math.floor(requested.length / 3));

  return names
    .map((name) => {
      const lowerName = name.toLowerCase();
      const distance = editDistance(lowerRequested, lowerName);
      const isClose =
        distance <= maxDistance ||
        lowerName.includes(lowerRequested) ||
        lowerRequested.includes(lowerName);

      return { name, distance, isClose };
    })
    .filter(({ isClose }) => isClose)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions)
    .map(({ name }) => name);
}

/**
 * Lists names for an error message, each in double quotes.
 * @param names - The names to list.
 * @returns The names, comma-separated.
 */
export function describeNames(names: readonly string[]): string {
  return names.map((name) => `"${name}"`).join(', ');
}

/**
 * Describes what a missing name might have meant, for the sentence after an
 * error's "not found" sentence: the close names, or else how many names
 * there are and the first three.
 * @param name - The name that wasn't found.
 * @param names - The names that exist.
 * @param itemWord - What one name names, such as `'region'` or
 * `'sequence'`. An `s` is added for any count but one.
 * @returns The sentence.
 */
export function describeMissingName(
  name: string,
  names: readonly string[],
  itemWord: string = 'region',
): string {
  const suggestions = suggestNames(name, names);

  if (suggestions.length > 0) {
    return `Did you mean ${describeNames(suggestions)}?`;
  }

  const shownNames = describeNames(names.slice(0, 3));
  const moreNames = names.length > 3 ? ', ...' : '';
  const countedWord = names.length === 1 ? itemWord : `${itemWord}s`;

  return `The atlas has ${names.length} ${countedWord}, named ${shownNames}${moreNames}.`;
}

/**
 * Finds the names in a list of region names or indices that aren't
 * regions.
 * @param frames - Region names, or indices, which are skipped.
 * @param hasRegion - Whether a region has a name.
 * @returns The missing names, once each, in the order they first appear.
 */
export function findMissingNames(
  frames: readonly (string | number)[],
  hasRegion: (name: string) => boolean,
): string[] {
  const missing = frames.filter(
    (frame): frame is string => typeof frame === 'string' && !hasRegion(frame),
  );

  return [...new Set(missing)];
}

/**
 * Describes region names that weren't found, for the end of an error
 * message: "the atlas has no region named ..." and what each name might
 * have meant.
 * @param missing - The names that weren't found, at least one.
 * @param names - Every region's name.
 * @returns The sentences.
 */
export function describeMissingRegionNames(
  missing: readonly string[],
  names: readonly string[],
): string {
  if (missing.length === 1) {
    return `the atlas has no region named "${missing[0]}". ${describeMissingName(missing[0], names)}`;
  }

  const details = missing
    .map((name) => `"${name}": ${describeMissingName(name, names)}`)
    .join(' ');

  return `the atlas has no regions named ${describeNames(missing)}. ${details}`;
}
