export function resolveIncludes(
  source: string,
  includeMap: Record<string, string>,
): string {
  const lines = source.split('\n');

  return lines
    .map((line, lineNumber) => {
      const isIncludesLine = line.includes('#include');

      if (isIncludesLine) {
        const match = line.match(/#include <(\w+)>/);

        if (!match) {
          throw new Error(
            `Invalid syntax for at line ${lineNumber + 1}:${line.indexOf('#include') + 1}. Expected #include <name> but got "${line.trim()}"`,
          );
        }

        const [fullMatch, name] = match;
        const col = line.indexOf(fullMatch) + 1;

        if (!name) {
          throw new Error(
            `Invalid syntax for at line ${lineNumber + 1}:${col}. Expected #include <name> but got "${fullMatch}"`,
          );
        }

        if (includeMap[name]) {
          return line.replace(fullMatch, includeMap[name]);
        } else {
          throw new Error(
            `Missing include: "${name}" at line ${lineNumber + 1}:${col}`,
          );
        }
      }

      return line;
    })
    .join('\n');
}
