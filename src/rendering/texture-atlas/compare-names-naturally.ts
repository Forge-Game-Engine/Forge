const tokenPattern = /\d+|\D+/g;

const isDigitRun = (token: string): boolean =>
  token.charCodeAt(0) >= 48 && token.charCodeAt(0) <= 57;

const compareCodeUnits = (a: string, b: string): number => {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
};

/**
 * Compares two runs of digits by value, without converting them to numbers,
 * so runs too long for a `number` still compare exactly.
 */
const compareDigitRuns = (a: string, b: string): number => {
  const strippedA = a.replace(/^0+/, '');
  const strippedB = b.replace(/^0+/, '');

  if (strippedA.length !== strippedB.length) {
    return strippedA.length - strippedB.length;
  }

  return compareCodeUnits(strippedA, strippedB);
};

/**
 * Compares two names in natural order: runs of ASCII digits compare by
 * value and everything else by UTF-16 code unit, so `run_2` comes before
 * `run_10` and `run_9.png` before `run_10.png`. Case-sensitive and
 * independent of the browser's locale. Names whose digit runs only differ
 * in leading zeros (`run_01`, `run_1`) are ordered by code unit, so the
 * order is total.
 * @param a - The first name.
 * @param b - The second name.
 * @returns A negative number if `a` comes first, a positive number if `b`
 * does, and `0` if they're equal.
 */
export function compareNamesNaturally(a: string, b: string): number {
  const tokensA = a.match(tokenPattern) ?? [];
  const tokensB = b.match(tokenPattern) ?? [];
  const sharedLength = Math.min(tokensA.length, tokensB.length);

  for (let i = 0; i < sharedLength; i++) {
    const tokenA = tokensA[i];
    const tokenB = tokensB[i];
    const comparison =
      isDigitRun(tokenA) && isDigitRun(tokenB)
        ? compareDigitRuns(tokenA, tokenB)
        : compareCodeUnits(tokenA, tokenB);

    if (comparison !== 0) {
      return comparison;
    }
  }

  if (tokensA.length !== tokensB.length) {
    return tokensA.length - tokensB.length;
  }

  return compareCodeUnits(a, b);
}
