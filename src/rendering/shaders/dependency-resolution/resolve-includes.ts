export function resolveIncludes(
  source: string,
  includeMap: Record<string, string>,
  includesAlreadyResolved: string[] = [],
  resolvedVariables: Set<string> = new Set(),
): string {
  const lines = source.split('\n');

  return lines
    .map((line, lineNumber) =>
      processLine(
        line,
        lineNumber,
        includeMap,
        includesAlreadyResolved,
        resolvedVariables,
      ),
    )
    .join('\n');
}

function processLine(
  line: string,
  lineNumber: number,
  includeMap: Record<string, string>,
  includesAlreadyResolved: string[],
  resolvedVariables: Set<string>,
): string {
  if (isIncludeLine(line)) {
    return processIncludeLine(
      line,
      lineNumber,
      includeMap,
      includesAlreadyResolved,
      resolvedVariables,
    );
  }

  if (isVariableDeclaration(line)) {
    return processVariableDeclaration(line, resolvedVariables);
  }

  return line;
}

function isIncludeLine(line: string): boolean {
  return line.includes('#include');
}

function processIncludeLine(
  line: string,
  lineNumber: number,
  includeMap: Record<string, string>,
  includesAlreadyResolved: string[],
  resolvedVariables: Set<string>,
): string {
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

  if (!includeMap[name]) {
    throw new Error(
      `Missing include for shader: "${name}" at line ${lineNumber + 1}:${column}`,
    );
  }

  includesAlreadyResolved.push(name);

  const resolvedContent = resolveIncludes(
    includeMap[name],
    includeMap,
    includesAlreadyResolved,
    resolvedVariables,
  );

  return line.replace(fullMatch, resolvedContent);
}

function isVariableDeclaration(line: string): boolean {
  return /^\s*(uniform|in)\s+\w+\s+\w+;/.test(line);
}

function processVariableDeclaration(
  line: string,
  resolvedVariables: Set<string>,
): string {
  if (resolvedVariables.has(line.trim())) {
    return ''; // Skip duplicate declarations
  }

  resolvedVariables.add(line.trim());
  return line;
}
