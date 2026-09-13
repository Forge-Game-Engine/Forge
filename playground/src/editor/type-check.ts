import {
  createSystem,
  createVirtualTypeScriptEnvironment,
  type VirtualTypeScriptEnvironment,
} from '@typescript/vfs';
import ts from 'typescript';

import {
  forgeDistDtsFiles,
  forgeSubpaths,
  resolveForgeSubpath,
  typescriptLibFiles,
} from '../forge-registry.js';

const gameFileName = '/game.ts';
const packageRoot = '/node_modules/@forge-game-engine/forge';

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  esModuleInterop: true,
  strict: true,
  skipLibCheck: true,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
};

function buildFsMap(): Map<string, string> {
  const fsMap = new Map<string, string>();

  // TypeScript's own lib files reference each other by name (e.g.
  // `lib.es2022.full.d.ts` references `lib.es2022.sharedmemory.d.ts`), and
  // which exact set a given `target`/`lib` combination needs is an
  // implementation detail that shifts between TypeScript versions. Since
  // every real `lib*.d.ts` file is already embedded in the app bundle
  // regardless, registering all of them sidesteps having to keep that set
  // in sync by hand.
  for (const [libFileName, contents] of typescriptLibFiles) {
    fsMap.set(`/${libFileName}`, contents);
  }

  for (const [relativePath, contents] of forgeDistDtsFiles) {
    fsMap.set(`${packageRoot}/dist/${relativePath}`, contents);
  }

  for (const subpath of forgeSubpaths) {
    const resolved = resolveForgeSubpath(subpath);

    if (!resolved) {
      continue;
    }

    const jsPath = resolved.dtsPath.replace(/\.d\.ts$/, '.js');

    fsMap.set(
      `${packageRoot}/${subpath}/index.d.ts`,
      `export * from '../dist/${jsPath}';`,
    );
  }

  // Seeded with a non-empty placeholder: `createVirtualLanguageServiceHost`
  // treats an empty-string `readFile` result as "file doesn't exist" (falsy
  // check), which would make TypeScript report the root file itself as
  // missing.
  fsMap.set(gameFileName, '\n');

  return fsMap;
}

let environment: VirtualTypeScriptEnvironment | null = null;

function getEnvironment(): VirtualTypeScriptEnvironment {
  if (!environment) {
    const system = createSystem(buildFsMap());

    environment = createVirtualTypeScriptEnvironment(
      system,
      [gameFileName],
      ts,
      compilerOptions,
    );
  }

  return environment;
}

export interface TypeCheckDiagnostic {
  message: string;
  line: number;
  column: number;
}

/**
 * Type-checks the game source against Forge's real type declarations using
 * an in-browser TypeScript language service (via `@typescript/vfs`),
 * independent of Monaco's own worker. esbuild only strips types when
 * bundling - it never checks them - so this is what actually catches type
 * errors before a build.
 * @param source - The game's TypeScript source code.
 * @returns Every syntactic and semantic diagnostic, sorted by position.
 */
export function typeCheckGameSource(source: string): TypeCheckDiagnostic[] {
  const env = getEnvironment();

  env.updateFile(gameFileName, source);

  const diagnostics = [
    ...env.languageService.getSyntacticDiagnostics(gameFileName),
    ...env.languageService.getSemanticDiagnostics(gameFileName),
  ];

  return diagnostics.map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      '\n',
    );

    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start,
      );

      return { message, line: line + 1, column: character + 1 };
    }

    return { message, line: 0, column: 0 };
  });
}
