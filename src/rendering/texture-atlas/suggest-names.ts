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
