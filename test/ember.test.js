import { describe, expect, test, afterEach, beforeEach } from 'vitest';
import { getProjectFixture, setupProjectRunner } from './test-helpers';

describe('validation-test ember@3.28 LTS', () => {
  let project;

  beforeEach(async () => {
    project = await getProjectFixture('ember-app-3.28');
  });

  afterEach(() => {
    project.dispose();
  });

  test('graph', () => {
    const { run } = setupProjectRunner(project);
    const results = run(['graph']);

    expect(results.exitCode).toBe(0);
    expect(results.stdout, 'should show ordering between locale service and share-button')
      .toContain(`[DATA] app/services/locale.js
[DATA] app/components/share-button.js`);

    expect(results.stdout).toMatchSnapshot();

    project.dispose();
  });

  test('migrate', () => {
    const { run, readFile } = setupProjectRunner(project);
    const results = run(['migrate', '--ci']);

    expect(results.exitCode).toBe(0);
    expect(results.stdout).toContain('[STARTED] Convert JS files to TS');
    expect(results.stdout).toContain('[SUCCESS] Migration Complete');

    expect(readFile('app/components/map.ts')).toMatchSnapshot();
    expect(readFile('app/components/share-button.ts')).toMatchSnapshot();
    expect(readFile('app/models/rental.ts')).toMatchSnapshot();
    expect(readFile('app/components/HelloWorld.gts')).toMatchSnapshot();
  });
});

describe('validation-test ember@4.4 LTS', () => {
  let project;

  beforeEach(async () => {
    project = await getProjectFixture('ember-app-4.4');
  });

  afterEach(() => {
    project.dispose();
  });

  test('graph', () => {
    const { run } = setupProjectRunner(project);
    const results = run(['graph']);

    expect(results.exitCode).toBe(0);
    expect(results.stdout, 'should show ordering between locale service and share-button')
      .toContain(`[DATA] app/services/locale.js
[DATA] app/components/share-button.js`);

    expect(results.stdout).toMatchSnapshot();

    project.dispose();
  });

  test('migrate', () => {
    const { run, readFile } = setupProjectRunner(project);
    const results = run(['migrate', '--ci']);

    expect(results.exitCode).toBe(0);
    expect(results.stdout).toContain('[STARTED] Convert JS files to TS');
    expect(results.stdout).toContain('[SUCCESS] Migration Complete');

    expect(readFile('app/components/map.ts')).toMatchSnapshot();
    expect(readFile('app/components/share-button.ts')).toMatchSnapshot();
    expect(readFile('app/models/rental.ts')).toMatchSnapshot();
    expect(readFile('app/components/HelloWorld.gts')).toMatchSnapshot();
  });
});
