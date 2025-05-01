import type { ForgeShaderSource } from './forge-shader-source';

export function resolveIncludes(
  source: ForgeShaderSource,
  includeMap: ForgeShaderSource[],
  includesAlreadyResolved: string[] = [],
  resolvedVariables: Set<string> = new Set(),
): string {
  const lines = source.rawSource.split('\n');

  const processedLines = lines
    .map((line, lineNumber) =>
      processLine(
        source,
        line,
        lineNumber,
        includeMap,
        includesAlreadyResolved,
        resolvedVariables,
      ),
    )
    .join('\n');

  // Remove consecutive empty lines
  return processedLines.replace(/^\s*$(?:\r\n?|\n){2,}/gm, '\n');
}

function processLine(
  source: ForgeShaderSource,
  line: string,
  lineNumber: number,
  includeMap: ForgeShaderSource[],
  includesAlreadyResolved: string[],
  resolvedVariables: Set<string>,
): string {
  if (isIncludeLine(line)) {
    return processIncludeLine(
      source,
      line,
      lineNumber,
      includeMap,
      includesAlreadyResolved,
      resolvedVariables,
    );
  }

  if (isVariableDeclarationLine(line)) {
    return processVariableDeclarationLine(line, resolvedVariables);
  }

  if (isPropertyLine(line)) {
    return processPropertyLine();
  }

  return line;
}

function isIncludeLine(line: string): boolean {
  return line.includes('#include');
}

function processIncludeLine(
  source: ForgeShaderSource,
  line: string,
  lineNumber: number,
  includeMap: ForgeShaderSource[],
  includesAlreadyResolved: string[],
  resolvedVariables: Set<string>,
): string {
  const match = line.match(/#include <(\w+)>/);

  if (!match) {
    throw new Error(
      `Invalid shader syntax at line ${lineNumber + 1}:${line.indexOf('#include') + 1}. Expected #include <name> but got "${line.trim()}" when resolving "${source.name}"`,
    );
  }

  const [fullMatch, name] = match;
  const column = line.indexOf(fullMatch) + 1;

  if (!name) {
    throw new Error(
      `Invalid shader syntax at line ${lineNumber + 1}:${column}. Expected #include <name> but got "${fullMatch}" when resolving "${source.name}"`,
    );
  }

  if (includesAlreadyResolved.includes(name)) {
    return '';
  }

  const includeSource = includeMap.find((include) => include.name === name);

  if (!includeSource) {
    throw new Error(
      `Missing include for shader: "${name}" at line ${lineNumber + 1}:${column} when resolving "${source.name}"`,
    );
  }

  includesAlreadyResolved.push(name);

  const resolvedContent = resolveIncludes(
    includeSource,
    includeMap,
    includesAlreadyResolved,
    resolvedVariables,
  );

  return line.replace(fullMatch, resolvedContent);
}

function isVariableDeclarationLine(line: string): boolean {
  return /^\s*(uniform|in)\s+\w+\s+\w+;/.test(line);
}

function processVariableDeclarationLine(
  line: string,
  resolvedVariables: Set<string>,
): string {
  if (resolvedVariables.has(line.trim())) {
    return ''; // Skip duplicate declarations
  }

  resolvedVariables.add(line.trim());
  return line;
}

function isPropertyLine(line: string): boolean {
  return line.includes('#property');
}

function processPropertyLine(): string {
  return '';
}
