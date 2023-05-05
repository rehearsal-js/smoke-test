import { describe, expect, test, afterEach, beforeEach } from 'vitest';
import { getProjectFixture, setupProjectRunner } from './test-helpers';

describe('validation-test: rehearsal migrate', () => {
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
