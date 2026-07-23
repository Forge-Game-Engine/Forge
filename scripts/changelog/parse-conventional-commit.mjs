const EXCLUDED_TYPES = new Set([
  'chore',
  'style',
  'refactor',
  'test',
  'ci',
  'docs',
  'build',
]);

/**
 * Parses a Conventional Commits subject line (e.g. a commit message or PR
 * title) into its type, scope, breaking-change flag, and description.
 * @param {string} subject - The subject line to parse.
 * @returns {{ type: string, scope: string | null, breaking: boolean, description: string } | null}
 *   The parsed commit, or null if the subject doesn't follow the
 *   `type(scope)!: description` format.
 */
export function parseConventionalCommit(subject) {
  const cleaned = subject.replace(/\s*\(#\d+\)\s*$/, '').trim();
  const match = cleaned.match(/^(\w+)(\([^)]*\))?(!)?:\s*(.*)$/);

  if (!match) {
    return null;
  }

  const [, type, scopeRaw, breaking, description] = match;

  return {
    type: type.toLowerCase(),
    scope: scopeRaw ? scopeRaw.slice(1, -1) : null,
    breaking: Boolean(breaking),
    description,
  };
}

/**
 * Determines whether a Conventional Commits type is excluded from the
 * changelog (chore, style, refactor, test, ci, docs, build).
 * @param {string} type - The commit type, e.g. "feat" or "fix".
 * @returns {boolean} True if commits of this type should not appear in the changelog.
 */
export function isExcludedType(type) {
  return EXCLUDED_TYPES.has(type.toLowerCase());
}
