import { ForgeShaderSource } from '../forge-shader-source';
import { ShaderPreProcessor } from '../shader-pre-processor';

export class ResolveIncludesPreProcessor implements ShaderPreProcessor {
  private readonly _includeMap: ForgeShaderSource[];

  constructor(includeMap: ForgeShaderSource[]) {
    this._includeMap = includeMap;
  }

  public process(shader: ForgeShaderSource): string {
    return this._resolveIncludes(shader);
  }

  private _resolveIncludes(
    source: ForgeShaderSource,
    includesAlreadyResolved: string[] = [],
    resolvedVariables: Set<string> = new Set(),
  ): string {
    const lines = source.rawSource.split('\n');

    const processedLines = lines
      .map((line, lineNumber) =>
        this._processLine(
          source,
          line,
          lineNumber,
          includesAlreadyResolved,
          resolvedVariables,
        ),
      )
      .join('\n');

    // Remove consecutive empty lines

    return processedLines.replaceAll(/^[ \t]*$(?:\r\n?|\n){2,}/gm, '\n');
  }

  private _processLine(
    source: ForgeShaderSource,
    line: string,
    lineNumber: number,
    includesAlreadyResolved: string[],
    resolvedVariables: Set<string>,
  ): string {
    if (this._isIncludeLine(line)) {
      return this._processIncludeLine(
        source,
        line,
        lineNumber,
        includesAlreadyResolved,
        resolvedVariables,
      );
    }

    if (this._isVariableDeclarationLine(line)) {
      return this._processVariableDeclarationLine(line, resolvedVariables);
    }

    if (this._isPropertyLine(line)) {
      return this._processPropertyLine();
    }

    return line;
  }

  private _isIncludeLine(line: string): boolean {
    return /#pragma\s+forge\s+include/.test(line);
  }

  private _processIncludeLine(
    source: ForgeShaderSource,
    line: string,
    lineNumber: number,
    includesAlreadyResolved: string[],
    resolvedVariables: Set<string>,
  ): string {
    const match = RegExp(/#pragma\s+forge\s+include\s*\(\s*(\w+)\s*\)/).exec(
      line,
    );

    if (!match) {
      const column = line.search(/#pragma\s+forge\s+include/) + 1;

      throw new Error(
        `Invalid shader syntax at line ${lineNumber + 1}:${column}. Expected "#pragma forge include(name)" but got "${line.trim()}" when resolving "${source.name}"`,
      );
    }

    const [fullMatch, name] = match;
    const column = line.indexOf(fullMatch) + 1;

    if (!name) {
      throw new Error(
        `Invalid shader syntax at line ${lineNumber + 1}:${column}. Expected "#pragma forge include(name)" but got "${fullMatch}" when resolving "${source.name}"`,
      );
    }

    if (includesAlreadyResolved.includes(name)) {
      return '';
    }

    const includeSource = this._includeMap.find(
      (include) => include.name === name,
    );

    if (!includeSource) {
      throw new Error(
        `Missing include for shader: "${name}" at line ${lineNumber + 1}:${column} when resolving "${source.name}"`,
      );
    }

    includesAlreadyResolved.push(name);

    const resolvedContent = this._resolveIncludes(
      includeSource,
      includesAlreadyResolved,
      resolvedVariables,
    );

    const continuationLine = lineNumber + 2;

    return `#line 1\n${resolvedContent}\n#line ${continuationLine}`;
  }

  private _isVariableDeclarationLine(line: string): boolean {
    return /^\s*(uniform|in)\s+\w+\s+\w+;/.test(line);
  }

  private _processVariableDeclarationLine(
    line: string,
    resolvedVariables: Set<string>,
  ): string {
    if (resolvedVariables.has(line.trim())) {
      return ''; // Skip duplicate declarations
    }

    resolvedVariables.add(line.trim());

    return line;
  }

  private _isPropertyLine(line: string): boolean {
    return line.includes('#property');
  }

  private _processPropertyLine(): string {
    return '';
  }
}
