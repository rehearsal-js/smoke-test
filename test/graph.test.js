import { describe, expect, test, afterEach, beforeEach } from 'vitest';
import { setupProjectRunner } from './test-helpers';

describe('validation-test: rehearsal graph', () => {
  let run;
  let project;

  beforeEach(async () => {
    let runner = await setupProjectRunner('simple');
    run = runner.run;
    project = runner.project;
  });

  afterEach(async () => {
    project.dispose();
  });

  test('graph --help', () => {
    const results = run(['graph', '--help']);
    expect(results.exitCode).toBe(0);
    expect(results.stdout).toContain('graph [options] [basePath]');
  });

  test('graph', () => {
    const results = run(['graph']);

    expect(results.exitCode).toBe(0);
    expect(results.stdout).toContain(`[STARTED] Analyzing project dependency graph`);

    const output = results.stdout
      .split('\n')
      .filter((line) => line.startsWith('[DATA]'))
      .map((line) => line.slice('[DATA] '.length));

    // Assert the printed graph order of the files
    expect(output).toStrictEqual([
      "Graph order for '.':",
      '',
      'lib/sandwich.js',
      'lib/burger.js',
      'lib/hotdog.js',
      'index.js'
    ]);

    expect(results.stdout).toContain('[SUCCESS] Analyzing project dependency graph');
  });

  test.todo('graph basePath', () => {});
  test.todo('graph --output', () => {});
});
