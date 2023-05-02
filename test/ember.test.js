import { describe, expect, test } from 'vitest';
import { setupProjectRunner } from './test-helpers';

describe('validation-test ember@3.28 LTS', () => {
  test('graph', async () => {
    const { run, project } = await setupProjectRunner('ember-app-3.28');
    const results = run(['graph']);

    expect(results.exitCode).toBe(0);
    expect(results.stdout, 'should show ordering between locale service and share-button')
      .toContain(`[DATA] app/services/locale.js
[DATA] app/components/share-button.js`);

    expect(results.stdout).toMatchSnapshot();

    project.dispose();
  });

  test('migrate', async () => {
    const { run, project, readFile } = await setupProjectRunner('ember-app-3.28');
    const results = run(['migrate', '--ci']);

    expect(results.exitCode).toBe(0);
    expect(results.stdout).toContain('[STARTED] Convert JS files to TS');
    expect(results.stdout).toContain('[SUCCESS] Migration Complete');

    expect(readFile('app/components/map.ts')).toMatchSnapshot();
    expect(readFile('app/components/share-button.ts')).toMatchSnapshot();
    expect(readFile('app/models/rental.ts')).toMatchSnapshot();
    expect(readFile('app/components/HelloWorld.gts')).toMatchSnapshot();

    project.dispose();
  });
});

describe('validation-test ember@4.4 LTS', () => {
  test('graph', async () => {
    const { run, project } = await setupProjectRunner('ember-app-4.4');
    const results = run(['graph']);

    expect(results.exitCode).toBe(0);
    expect(results.stdout, 'should show ordering between locale service and share-button')
      .toContain(`[DATA] app/services/locale.js
[DATA] app/components/share-button.js`);

    expect(results.stdout).toMatchSnapshot();

    project.dispose();
  });

  test('migrate', async () => {
    const { run, project, readFile } = await setupProjectRunner('ember-app-4.4');
    const results = run(['migrate', '--ci']);

    expect(results.exitCode).toBe(0);
    expect(results.stdout).toContain('[STARTED] Convert JS files to TS');
    expect(results.stdout).toContain('[SUCCESS] Migration Complete');

    expect(readFile('app/components/map.ts')).toMatchSnapshot();
    expect(readFile('app/components/share-button.ts')).toMatchSnapshot();
    expect(readFile('app/models/rental.ts')).toMatchSnapshot();
    expect(readFile('app/components/HelloWorld.gts')).toMatchSnapshot();

    project.dispose();
  });
});
