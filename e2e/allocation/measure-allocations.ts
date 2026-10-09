import { expect, type Page, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..',
);

// The e2e dev server's root (see `vite.config.e2e.js`): a URL path that
// isn't under `/@fs/` is relative to it.
const fixturesRoot = join(repositoryRoot, 'e2e', 'fixtures');
const resultsDirectory = join(repositoryRoot, 'e2e', 'allocation-results');

// How many frames a scene runs before sampling starts. V8 optimizes a
// function after a few thousand calls, and unoptimized code can allocate
// (boxing numbers) where optimized code doesn't, so a function that runs
// once per frame is only judged once it's optimized, as it would be in a
// game that has been running for a minute.
const defaultWarmupFrames = 4_000;
const defaultSampledFrames = 2_000;

// Bytes between samples. With `--sampling-heap-profiler-suppress-randomness`
// (see `playwright.allocation.config.ts`) a sample is taken at exactly every
// this many bytes allocated, so which allocations are sampled doesn't depend
// on chance.
const samplingInterval = 512;

// The smallest object V8 allocates on the heap that a frame could plausibly
// make (a boxed number, or an empty object), in bytes.
const smallestObjectBytes = 16;

/**
 * The fewest samples that show a function allocates in steady state. A
 * function that allocates even one smallest object every frame is sampled
 * `sampledFrames * 16 / 512` times (62 over 2,000 frames). A function with
 * fewer than a quarter of that allocated less than one small object every
 * four frames: V8's own occasional allocations (an inline cache or feedback
 * update, a backing store that grows once), which land on whichever
 * function is running and differ by a sample or two between runs. They're
 * reported, but don't fail the spec, so its result is the same on every
 * run.
 */
function steadyStateSampleFloor(sampledFrames: number): number {
  return Math.ceil(
    (sampledFrames * smallestObjectBytes) / samplingInterval / 4,
  );
}

// Frames stepped per `page.evaluate`, so no single call runs for minutes.
const framesPerEvaluate = 250;

/**
 * A function that is known to allocate every frame, and is allowed to until
 * the change that removes it lands. A sample is allowed when any frame of
 * its stack is this function, so an entry can name the system an allocator
 * runs under rather than a helper (such as `Vec2.clone`) that every caller
 * shares.
 */
export interface AllowedAllocator {
  /** The function's file, relative to the repository root. */
  file: string;
  /** The function's name as V8 reports it (a method's own name, an arrow function's variable or property name). */
  functionName: string;
  /** What it allocates, and what change removes it. */
  reason: string;
  /**
   * Only allow samples charged to this function itself, not every sample
   * with it on the stack. For a function every frame runs under, such as
   * `EcsWorld.update`, which would otherwise allow everything.
   */
  chargedOnly?: boolean;
}

/** What an allocation spec checks. */
export interface AllocationSpecOptions {
  /** The fixture scene to run, by its `?scene=` name. */
  scene: string;
  /** The allocators this scene is allowed today. */
  allowList: readonly AllowedAllocator[];
  /**
   * Folders or files (relative to the repository root, e.g. `src/ecs/`) that
   * must allocate nothing, whatever the allow-list says: a sample charged to
   * one fails even if an allowed function is on its stack.
   */
  allocationFreeModules?: readonly string[];
  /** Frames run before sampling. Defaults to 4,000. */
  warmupFrames?: number;
  /** Frames run while sampling. Defaults to 2,000. */
  sampledFrames?: number;
}

/** One frame of a sampled allocation's stack. */
interface StackFrame {
  functionName: string;
  /** Relative to the repository root, or the raw URL for code outside it. */
  file: string;
  line: number;
  column: number;
  /** Whether the frame is Forge's (`src/`) or the scene's (`e2e/fixtures/`) code. */
  isOwnCode: boolean;
}

/** The functions sampled allocations were charged to, with their counts. */
export interface ChargedFunction {
  /** `<file>:<functionName>`. */
  charge: string;
  owner: 'forge' | 'scene';
  samples: number;
  /** The allow-list entry that allowed it, as `<file>:<functionName>`. */
  allowedBy: string | null;
}

/** The outcome of one allocation run, also written to `e2e/allocation-results/`. */
export interface AllocationReport {
  scene: string;
  warmupFrames: number;
  sampledFrames: number;
  samplingInterval: number;
  totalSamples: number;
  /** Samples with no frame of Forge's or the scene's code on their stack. */
  unchargedSamples: number;
  /**
   * The fewest samples a charged function needs to fail the spec (see
   * `steadyStateSampleFloor`).
   */
  steadyStateSampleFloor: number;
  charged: ChargedFunction[];
  /** The allow-list entries that allowed no sample in this run. */
  unusedAllowListEntries: string[];
  /** One printed stack per failing charged function. */
  violations: string[];
}

interface ProfileCallFrame {
  functionName: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
}

interface ProfileNode {
  id: number;
  callFrame: ProfileCallFrame;
  children: ProfileNode[];
}

interface SamplingHeapProfile {
  head: ProfileNode;
  samples: { size: number; nodeId: number; ordinal: number }[];
}

/**
 * Maps a script URL from the e2e dev server to a file relative to the
 * repository root, or returns `null` for code that isn't a file (V8's own
 * nodes, evaluated scripts).
 */
function toRepositoryFile(url: string): string | null {
  if (!url.startsWith('http')) {
    return null;
  }

  const pathname = decodeURIComponent(new URL(url).pathname);

  // Vite's own modules (`/@vite/client`, `/@id/...`) aren't files.
  if (pathname.startsWith('/@') && !pathname.startsWith('/@fs/')) {
    return null;
  }

  const absolute = pathname.startsWith('/@fs/')
    ? pathname.slice('/@fs'.length)
    : join(fixturesRoot, pathname);

  return relative(repositoryRoot, absolute).split(sep).join('/');
}

function toStackFrame(callFrame: ProfileCallFrame): StackFrame {
  const file = toRepositoryFile(callFrame.url);
  const isOwnCode =
    file !== null &&
    !file.includes('node_modules/') &&
    (file.startsWith('src/') || file.startsWith('e2e/fixtures/'));

  return {
    functionName: callFrame.functionName || '(anonymous)',
    file: file ?? callFrame.url,
    // The profile's positions are zero-based, in the code Vite serves.
    line: callFrame.lineNumber + 1,
    column: callFrame.columnNumber + 1,
    isOwnCode,
  };
}

/** Each profile node's stack, outermost frame first. */
function collectStacks(head: ProfileNode): Map<number, StackFrame[]> {
  const stacks = new Map<number, StackFrame[]>();
  const pending: { node: ProfileNode; parentStack: StackFrame[] }[] = [
    { node: head, parentStack: [] },
  ];

  while (pending.length > 0) {
    const { node, parentStack } = pending.pop()!;
    const stack = node.callFrame.url
      ? [...parentStack, toStackFrame(node.callFrame)]
      : parentStack;

    stacks.set(node.id, stack);

    for (const child of node.children) {
      pending.push({ node: child, parentStack: stack });
    }
  }

  return stacks;
}

const allowListKey = (entry: { file: string; functionName: string }): string =>
  `${entry.file}:${entry.functionName}`;

function formatStack(stack: readonly StackFrame[]): string {
  return [...stack]
    .reverse()
    .map(
      (frame) =>
        `    ${frame.functionName} in ${frame.file} (served line ${frame.line})`,
    )
    .join('\n');
}

/** A sample charged to a function, and whether it fails the spec. */
interface ChargedSample {
  charge: string;
  owner: ChargedFunction['owner'];
  allowedBy: string | null;
  /** Why the sample fails the spec, or `null` when it doesn't. */
  failure: string | null;
}

/**
 * Charges a sample to the innermost frame of Forge's or the scene's code on
 * its stack, and checks it against the allow-list and the allocation-free
 * modules.
 * @returns The charge, or `null` when no frame of the stack is Forge's or
 * the scene's code.
 */
function chargeSample(
  stack: readonly StackFrame[],
  allowedKeys: ReadonlySet<string>,
  chargedOnlyKeys: ReadonlySet<string>,
  allocationFreeModules: readonly string[],
): ChargedSample | null {
  const innermost = stack.findLast((frame) => frame.isOwnCode);

  if (!innermost) {
    return null;
  }

  const owner = innermost.file.startsWith('src/') ? 'forge' : 'scene';
  const charge = allowListKey(innermost);
  const allowingFrame = chargedOnlyKeys.has(charge)
    ? innermost
    : stack.find((frame) => allowedKeys.has(allowListKey(frame)));
  const allowedBy = allowingFrame ? allowListKey(allowingFrame) : null;

  if (
    allocationFreeModules.some((module) => innermost.file.startsWith(module))
  ) {
    return {
      charge,
      owner,
      allowedBy,
      failure: 'in a module that must allocate nothing',
    };
  }

  if (owner === 'forge' && allowedBy === null) {
    return { charge, owner, allowedBy, failure: 'not on the allow-list' };
  }

  return { charge, owner, allowedBy, failure: null };
}

/**
 * Charges every sample (see {@link chargeSample}) and sums the samples per
 * charged function.
 */
function analyzeProfile(
  profile: SamplingHeapProfile,
  options: AllocationSpecOptions,
  warmupFrames: number,
  sampledFrames: number,
): AllocationReport {
  const stacks = collectStacks(profile.head);
  const floor = steadyStateSampleFloor(sampledFrames);
  const allowedKeys = new Set(
    options.allowList.filter((entry) => !entry.chargedOnly).map(allowListKey),
  );
  const chargedOnlyKeys = new Set(
    options.allowList.filter((entry) => entry.chargedOnly).map(allowListKey),
  );
  const usedAllowListEntries = new Set<string>();
  const chargedByKey = new Map<string, ChargedFunction>();
  const failuresByKey = new Map<string, string>();
  let unchargedSamples = 0;

  for (const sample of profile.samples) {
    const stack = stacks.get(sample.nodeId) ?? [];
    const charged = chargeSample(
      stack,
      allowedKeys,
      chargedOnlyKeys,
      options.allocationFreeModules ?? [],
    );

    if (!charged) {
      unchargedSamples++;

      continue;
    }

    const { charge, owner, allowedBy, failure } = charged;
    const key = `${charge}|${allowedBy ?? ''}`;
    const total = chargedByKey.get(key) ?? {
      charge,
      owner,
      samples: 0,
      allowedBy,
    };

    total.samples++;
    chargedByKey.set(key, total);

    if (allowedBy) {
      usedAllowListEntries.add(allowedBy);
    }

    if (failure && !failuresByKey.has(key)) {
      failuresByKey.set(
        key,
        `${charge} allocates (${failure}):\n${formatStack(stack)}`,
      );
    }
  }

  const charged = [...chargedByKey.values()].sort(
    (a, b) => b.samples - a.samples || a.charge.localeCompare(b.charge),
  );

  return {
    scene: options.scene,
    warmupFrames,
    sampledFrames,
    samplingInterval,
    totalSamples: profile.samples.length,
    unchargedSamples,
    charged,
    unusedAllowListEntries: options.allowList
      .map(allowListKey)
      .filter((key) => !usedAllowListEntries.has(key)),
    steadyStateSampleFloor: floor,
    violations: [...failuresByKey]
      .filter(([key]) => (chargedByKey.get(key)?.samples ?? 0) >= floor)
      .map(([, failure]) => failure),
  };
}

async function stepFrames(page: Page, frameCount: number): Promise<void> {
  for (let done = 0; done < frameCount; done += framesPerEvaluate) {
    const frames = Math.min(framesPerEvaluate, frameCount - done);

    // Each chunk depends on the previous one finishing.
    // eslint-disable-next-line no-await-in-loop
    await page.evaluate((count) => {
      const scene = window.__forgeTestHooks!;

      for (let i = 0; i < count; i++) {
        scene.step();
      }
    }, frames);
  }
}

/**
 * Loads a scene, runs it to a steady state, samples every allocation over
 * the following frames through the DevTools Protocol's sampling heap
 * profiler, and charges each to the innermost frame of Forge's (`src/`) or
 * the scene's (`e2e/fixtures/`) code on its stack. Frames with no URL (V8's
 * own nodes) and dependencies' frames are skipped, so an allocation inside
 * a dependency Forge calls is charged to Forge.
 *
 * Writes the report to `e2e/allocation-results/<scene>.json` and attaches
 * it to the test.
 * @param page - The test's page.
 * @param options - The scene and what it's allowed to allocate.
 * @returns The report, whose `violations` lists every sample charged to
 * Forge that no allow-list entry allows, and every sample charged to an
 * allocation-free module.
 */
export async function measureSteadyStateAllocations(
  page: Page,
  options: AllocationSpecOptions,
): Promise<AllocationReport> {
  const warmupFrames = options.warmupFrames ?? defaultWarmupFrames;
  const sampledFrames = options.sampledFrames ?? defaultSampledFrames;

  await test.step(`load the ${options.scene} scene`, async () => {
    let pageError: Error | undefined;

    page.once('pageerror', (error) => {
      pageError = error;
    });

    await page.goto(`/?scene=${options.scene}`);

    try {
      await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
    } catch (timeoutError) {
      throw pageError ?? timeoutError;
    }
  });

  const warmupStart = performance.now();

  await test.step(`warm up for ${warmupFrames} frames`, () =>
    stepFrames(page, warmupFrames));

  const samplingStart = performance.now();

  const session = await page.context().newCDPSession(page);

  const profile =
    await test.step(`sample allocations over ${sampledFrames} frames`, async () => {
      await session.send('HeapProfiler.enable');
      await session.send('HeapProfiler.startSampling', {
        samplingInterval,
        // Without these the profile only holds objects still alive when
        // sampling stops, not the per-frame garbage this test looks for.
        includeObjectsCollectedByMinorGC: true,
        includeObjectsCollectedByMajorGC: true,
      });

      await stepFrames(page, sampledFrames);

      const { profile: sampled } = await session.send(
        'HeapProfiler.stopSampling',
      );

      return sampled;
    });

  await session.detach();

  const timing = {
    warmupSeconds: (samplingStart - warmupStart) / 1000,
    samplingSeconds: (performance.now() - samplingStart) / 1000,
  };
  const report = analyzeProfile(profile, options, warmupFrames, sampledFrames);

  console.log(
    `[allocation] ${options.scene}: warm-up ${timing.warmupSeconds.toFixed(1)} s, ` +
      `sampling ${timing.samplingSeconds.toFixed(1)} s, ${report.totalSamples} samples`,
  );
  const reportJson = `${JSON.stringify(report, null, 2)}\n`;

  mkdirSync(resultsDirectory, { recursive: true });
  writeFileSync(join(resultsDirectory, `${options.scene}.json`), reportJson);
  await test.info().attach(`${options.scene}-allocations.json`, {
    body: reportJson,
    contentType: 'application/json',
  });

  return report;
}

/**
 * Fails the test with every violation's stack, and notes allow-list
 * entries that allowed nothing, so a change that removes an allocator also
 * removes its entry.
 * @param report - The report from {@link measureSteadyStateAllocations}.
 */
export function expectNoUnexpectedAllocations(report: AllocationReport): void {
  for (const entry of report.unusedAllowListEntries) {
    test.info().annotations.push({
      type: 'unused allow-list entry',
      description: `${entry} allocated nothing in ${report.scene}; remove it from the allow-list if it no longer allocates.`,
    });
  }

  expect(
    report.violations,
    `Steady-state allocations in ${report.scene}:\n\n${report.violations.join('\n\n')}`,
  ).toEqual([]);
}
