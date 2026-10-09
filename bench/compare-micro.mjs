#!/usr/bin/env node

// Compares the microbenchmarks (`src/**/*.bench.ts`) of two commits on the
// same machine, in the same job, and fails when the head commit is slower
// than the base commit by more than the threshold.
//
// Usage:
//   node bench/compare-micro.mjs --base <ref> [--head <ref>] [--runs <n>]
//     [--threshold <fraction>] [--filter <substring>] [--keep]
//
// 1. Each commit is exported (`git archive`) into its own folder, with its
//    dependencies: a link to this checkout's `node_modules` when the
//    commit's lockfile matches this checkout's, otherwise `npm ci`.
// 2. Every benchmark file runs `--runs` times (default 5) for each commit,
//    alternating base and head (and which goes first), so a slow period on
//    the machine hits both.
// 3. Each benchmark's result is the median of its per-run medians.
//    Results are matched by file and benchmark name, and each commit runs
//    its own benchmark files against its own code, so a benchmark changed
//    alongside an API still compares the same operation. A benchmark that
//    exists on only one side is reported, not gated.
// 4. A benchmark slower by more than `--threshold` (default 0.1, 10%) is
//    measured again the same way, and fails the comparison only if it is
//    slower again.
// 5. The table goes to stdout, to `bench/results/compare-micro.md` and
//    `.json`, and to the GitHub Actions job summary when there is one.

import { execFileSync, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const resultsDirectory = join(repositoryRoot, 'bench', 'results');

/**
 * Reads the command line options.
 * @returns {{ base: string, head: string, runs: number, threshold: number, filter: string | undefined, keep: boolean }}
 */
function readOptions() {
  const { values } = parseArgs({
    options: {
      base: { type: 'string' },
      head: { type: 'string', default: 'HEAD' },
      runs: { type: 'string', default: '5' },
      threshold: { type: 'string', default: '0.1' },
      filter: { type: 'string' },
      keep: { type: 'boolean', default: false },
    },
  });

  if (!values.base) {
    throw new Error(
      'Missing --base: the commit, branch or tag to compare against, e.g. --base origin/dev.',
    );
  }

  const runs = Number(values.runs);
  const threshold = Number(values.threshold);

  if (!Number.isInteger(runs) || runs < 1) {
    throw new Error(
      `--runs must be a positive integer, received ${values.runs}.`,
    );
  }

  if (!(threshold > 0)) {
    throw new Error(
      `--threshold must be a positive fraction, received ${values.threshold}.`,
    );
  }

  return {
    base: values.base,
    head: values.head,
    runs,
    threshold,
    filter: values.filter,
    keep: values.keep,
  };
}

/**
 * Runs git in the repository and returns its trimmed output.
 * @param {string[]} args
 * @returns {string}
 */
function git(args) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }).trim();
}

/**
 * Exports a commit's tracked files into `directory` and gives it the
 * dependencies its lockfile asks for.
 * @param {string} commit - The commit's full SHA.
 * @param {string} directory - The empty folder to export into.
 */
function prepareCommit(commit, directory) {
  mkdirSync(directory, { recursive: true });

  const archive = spawnSync('git', ['archive', '--format=tar', commit], {
    cwd: repositoryRoot,
    maxBuffer: 1024 * 1024 * 1024,
  });

  if (archive.status !== 0) {
    throw new Error(`git archive ${commit} failed: ${archive.stderr}`);
  }

  execFileSync('tar', ['-x', '-C', directory], { input: archive.stdout });

  const lockfile = readFileSync(join(directory, 'package-lock.json'), 'utf8');
  const ownLockfile = readFileSync(
    join(repositoryRoot, 'package-lock.json'),
    'utf8',
  );
  const ownNodeModules = join(repositoryRoot, 'node_modules');

  if (lockfile === ownLockfile && existsSync(ownNodeModules)) {
    symlinkSync(ownNodeModules, join(directory, 'node_modules'), 'dir');

    return;
  }

  console.log(`Installing dependencies for ${commit.slice(0, 10)}...`);
  execFileSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: directory,
    stdio: 'inherit',
  });
}

/**
 * Lists a checkout's benchmark files, relative to its root.
 * @param {string} directory
 * @returns {string[]}
 */
function findBenchmarkFiles(directory) {
  const sourceDirectory = join(directory, 'src');

  if (!existsSync(sourceDirectory)) {
    return [];
  }

  return readdirSync(sourceDirectory, { recursive: true })
    .map((entry) => join('src', String(entry)).split('\\').join('/'))
    .filter((path) => path.endsWith('.bench.ts'))
    .sort();
}

/**
 * Runs one benchmark file in a checkout and returns each benchmark's median
 * time in milliseconds, keyed by `<file> > <describe blocks> > <name>`.
 * @param {string} directory - The checkout.
 * @param {string} file - The benchmark file, relative to the checkout.
 * @returns {Map<string, number>}
 */
function runBenchmarkFile(directory, file) {
  const outputPath = join(directory, '.bench-output.json');

  rmSync(outputPath, { force: true });

  const result = spawnSync(
    process.execPath,
    [
      join(directory, 'node_modules', 'vitest', 'vitest.mjs'),
      'bench',
      '--run',
      file,
      '--outputJson',
      outputPath,
    ],
    { cwd: directory, encoding: 'utf8', env: { ...process.env, CI: 'true' } },
  );

  if (result.status !== 0 || !existsSync(outputPath)) {
    throw new Error(
      `Benchmark ${file} failed in ${directory}:\n${result.stdout}\n${result.stderr}`,
    );
  }

  /** @type {{ files: { groups: { fullName: string, benchmarks: { name: string, median: number }[] }[] }[] }} */
  const report = JSON.parse(readFileSync(outputPath, 'utf8'));
  const medians = new Map();

  for (const reportedFile of report.files) {
    for (const group of reportedFile.groups) {
      for (const benchmark of group.benchmarks) {
        medians.set(`${group.fullName} > ${benchmark.name}`, benchmark.median);
      }
    }
  }

  return medians;
}

/**
 * The median of a list of numbers.
 * @param {number[]} values
 * @returns {number}
 */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * Runs benchmark files for both commits, alternating between them, and
 * returns each benchmark's median of per-run medians for each commit.
 * @param {{ base: string, head: string }} directories
 * @param {{ base: string[], head: string[] }} filesBySide
 * @param {string[]} files - The files to run, each on the sides that have it.
 * @param {number} runs
 * @returns {{ base: Map<string, number>, head: Map<string, number> }}
 */
function measure(directories, filesBySide, files, runs) {
  /** @type {{ base: Map<string, number[]>, head: Map<string, number[]> }} */
  const samples = { base: new Map(), head: new Map() };

  for (let run = 0; run < runs; run++) {
    for (const file of files) {
      const order = run % 2 === 0 ? ['base', 'head'] : ['head', 'base'];

      for (const side of order) {
        if (!filesBySide[side].includes(file)) {
          continue;
        }

        console.log(`  run ${run + 1}/${runs}: ${side} ${file}`);

        for (const [key, value] of runBenchmarkFile(directories[side], file)) {
          const list = samples[side].get(key) ?? [];

          list.push(value);
          samples[side].set(key, list);
        }
      }
    }
  }

  const summarize = (map) =>
    new Map([...map].map(([key, values]) => [key, median(values)]));

  return { base: summarize(samples.base), head: summarize(samples.head) };
}

/**
 * Formats a duration in milliseconds for the table.
 * @param {number | undefined} milliseconds
 * @returns {string}
 */
function formatTime(milliseconds) {
  if (milliseconds === undefined) {
    return '–';
  }

  if (milliseconds < 1) {
    return `${(milliseconds * 1000).toFixed(1)} µs`;
  }

  return `${milliseconds.toFixed(3)} ms`;
}

/**
 * Builds the Markdown report.
 * @param {object[]} rows
 * @param {{ base: string, head: string, runs: number, threshold: number }} context
 * @returns {string}
 */
function formatReport(rows, context) {
  const lines = [
    '## Microbenchmarks: base versus head',
    '',
    `Base \`${context.base.slice(0, 10)}\`, head \`${context.head.slice(0, 10)}\`; ` +
      `median of ${context.runs} alternating runs per side; ` +
      `fails when head is more than ${(context.threshold * 100).toFixed(0)}% slower twice in a row.`,
    '',
    '| Benchmark | Base | Head | Change | Status |',
    '| --- | --: | --: | --: | --- |',
  ];

  for (const row of rows) {
    const change =
      row.change === null
        ? '–'
        : `${row.change >= 0 ? '+' : ''}${(row.change * 100).toFixed(1)}%`;

    lines.push(
      `| ${row.key.replaceAll('|', '\\|')} | ${formatTime(row.base)} | ${formatTime(row.head)} | ${change} | ${row.status} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const options = readOptions();
  const commits = {
    base: git(['rev-parse', '--verify', `${options.base}^{commit}`]),
    head: git(['rev-parse', '--verify', `${options.head}^{commit}`]),
  };
  const workDirectory = mkdtempSync(join(tmpdir(), 'forge-bench-compare-'));
  const directories = {
    base: join(workDirectory, 'base'),
    head: join(workDirectory, 'head'),
  };

  console.log(`Base ${commits.base}\nHead ${commits.head}`);
  console.log(`Exporting both commits into ${workDirectory}`);

  try {
    prepareCommit(commits.base, directories.base);
    prepareCommit(commits.head, directories.head);

    const filesBySide = {
      base: findBenchmarkFiles(directories.base),
      head: findBenchmarkFiles(directories.head),
    };
    const files = [...new Set([...filesBySide.base, ...filesBySide.head])]
      .filter((file) => !options.filter || file.includes(options.filter))
      .sort();

    if (files.length === 0) {
      throw new Error('Neither commit has a benchmark file to run.');
    }

    console.log(`Measuring ${files.length} benchmark files...`);

    const results = measure(directories, filesBySide, files, options.runs);
    const keys = [
      ...new Set([...results.base.keys(), ...results.head.keys()]),
    ].sort();
    const isRegression = (base, head) =>
      base !== undefined &&
      head !== undefined &&
      head > base * (1 + options.threshold);
    const suspects = keys.filter((key) =>
      isRegression(results.base.get(key), results.head.get(key)),
    );

    /** @type {Map<string, { base: number | undefined, head: number | undefined }>} */
    const remeasured = new Map();

    if (suspects.length > 0) {
      const suspectFiles = files.filter((file) =>
        suspects.some((key) => key.startsWith(`${file} >`)),
      );

      console.log(
        `${suspects.length} benchmarks slower than the threshold; measuring ${suspectFiles.length} files again...`,
      );

      const again = measure(
        directories,
        filesBySide,
        suspectFiles,
        options.runs,
      );

      for (const key of suspects) {
        remeasured.set(key, {
          base: again.base.get(key),
          head: again.head.get(key),
        });
      }
    }

    let failed = false;

    const rows = keys.map((key) => {
      const first = {
        base: results.base.get(key),
        head: results.head.get(key),
      };
      const second = remeasured.get(key);
      const final = second ?? first;
      const change =
        final.base !== undefined && final.head !== undefined
          ? final.head / final.base - 1
          : null;
      let status = 'ok';

      if (first.base === undefined) {
        status = 'new (not gated)';
      } else if (first.head === undefined) {
        status = 'removed (not gated)';
      } else if (second && isRegression(second.base, second.head)) {
        status = '**regressed**';
        failed = true;
      } else if (second) {
        status = 'ok on re-run';
      }

      return { key, ...final, change, status };
    });

    const context = { ...options, ...commits };
    const report = formatReport(rows, context);

    console.log(`\n${report}`);
    mkdirSync(resultsDirectory, { recursive: true });
    writeFileSync(join(resultsDirectory, 'compare-micro.md'), report);
    writeFileSync(
      join(resultsDirectory, 'compare-micro.json'),
      `${JSON.stringify({ ...commits, threshold: options.threshold, runs: options.runs, rows }, null, 2)}\n`,
    );

    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
    }

    console.log(
      `Report written to ${relative(repositoryRoot, join(resultsDirectory, 'compare-micro.md'))}`,
    );

    if (failed) {
      console.error(
        `Head is more than ${(options.threshold * 100).toFixed(0)}% slower than base on a re-run.`,
      );
      process.exitCode = 1;
    }
  } finally {
    if (options.keep) {
      console.log(`Kept ${workDirectory}`);
    } else {
      rmSync(workDirectory, { recursive: true, force: true });
    }
  }
}

main();
