import { describe, expect, test, afterEach, beforeEach } from 'vitest';
import { getProjectFixture, setupProjectRunner } from './test-helpers';

describe('validation-test: rehearsal graph', () => {
  let run;
  let project;

  beforeEach(async () => {
    project = await getProjectFixture('simple');
    let runner = setupProjectRunner(project);
    run = runner.run;
  });

  afterEach(async () => {
    project.dispose();
  });

  test('graph --help', () => {
    const results = run(['graph', '--help']);
    expect(results.exitCode).toBe(0);
    expect(results.stdout).toContain('graph [options] [srcDir]');
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
