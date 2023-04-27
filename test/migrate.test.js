#!/usr/bin/env node

import { describe, expect, test, afterEach, beforeEach } from 'vitest';
import { Project } from 'fixturify-project';
import { runCommandFactory, setupProject, resolveCLIBin } from './test-helpers';

describe('validation-test @rehearsal/cli migrate', () => {
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

  test('migrate --ci', async () => {
    // TODO refactor to move and fix when avaiable
    const results = run(['migrate', '--ci']);

    // Dumping the output for debuggability
    expect(results.stdout).toContain('[STARTED] Convert JS files to TS');
    expect(results.stdout).toContain('[DATA] git mv /lib/sandwich.js to /lib/sandwich.ts');
    expect(results.stdout).toContain('[DATA] git mv /lib/burger.js to /lib/burger.ts');
    expect(results.stdout).toContain('[DATA] git mv /lib/hotdog.js to /lib/hotdog.ts');
    expect(results.stdout).toContain('[DATA] git mv /index.js to /index.ts');
    expect(results.stdout).toContain('[DATA] processing file: /lib/sandwich.ts');
    expect(results.stdout).toContain('[DATA] processing file: /lib/burger.ts');
    expect(results.stdout).toContain('[DATA] processing file: /lib/hotdog.ts');
    expect(results.stdout).toContain('[DATA] processing file: /index.ts');
    expect(results.stdout).toContain('[SUCCESS] Migration Complete');
  });
});
