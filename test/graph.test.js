#!/usr/bin/env node

import { describe, expect, test, afterEach, beforeEach } from 'vitest';
import { Project } from 'fixturify-project';
import { runCommandFactory, setupProject, resolveCLIBin } from './test-helpers';

describe('validation-test @rehearsal/cli graph', () => {
  let run;
  let project;

  beforeEach(async () => {
    project = new Project('simple', '1.0.0', {
      files: {
        'index.js': `
          import './lib/hotdog';
          import './lib/burger';
        `,
        lib: {
          'hotdog.js': `import './sandwich';`,
          'burger.js': `import './sandwich';`,
          'sandwich.js': `import 'chalk';`
        }
      }
    });
    project.pkg.exports = './index.js';
    project.pkg.volta = {
      node: '16.19.0'
    };
    project.addDependency('chalk', '5.2.0');

    // Setup project with dependencies to use rehearsal e.g. typescript, eslint, prettier
    await setupProject(project);

    const bin = resolveCLIBin(project);

    // Set up command for tests
    run = runCommandFactory(bin, { cwd: project.baseDir });
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
