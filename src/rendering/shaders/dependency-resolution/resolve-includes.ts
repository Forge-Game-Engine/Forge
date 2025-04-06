export function resolveIncludes(
  source: string,
  includeMap: Record<string, string>,
  includesAlreadyResolved: string[] = [],
): string {
  const lines = source.split('\n');

  return lines
    .map((line, lineNumber) => {
      const isIncludesLine = line.includes('#include');

      if (isIncludesLine) {
        const match = line.match(/#include <(\w+)>/);

        if (!match) {
          throw new Error(
            `Invalid shader syntax at line ${lineNumber + 1}:${line.indexOf('#include') + 1}. Expected #include <name> but got "${line.trim()}"`,
          );
        }

        const [fullMatch, name] = match;

        const column = line.indexOf(fullMatch) + 1;

        if (!name) {
          throw new Error(
            `Invalid shader syntax at line ${lineNumber + 1}:${column}. Expected #include <name> but got "${fullMatch}"`,
          );
        }

        if (includesAlreadyResolved.includes(name)) {
          return '';
        }

        if (includeMap[name]) {
          includesAlreadyResolved.push(name);

          return line.replace(
            fullMatch,
            resolveIncludes(
              includeMap[name],
              includeMap,
              includesAlreadyResolved,
            ),
          );
        } else {
          throw new Error(
            `Missing include for shader: "${name}" at line ${lineNumber + 1}:${column}`,
          );
        }
      }

      return line;
    })
    .join('\n');
}
