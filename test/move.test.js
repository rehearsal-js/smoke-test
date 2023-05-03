import { describe, expect, test } from 'vitest';
import { getProjectFixture, setupProjectRunner } from './test-helpers';

describe('validation-test: rehearsal move', async () => {
  const variants = [
    { variant: 'simple', args: ['--help'] },
    //   { variant: 'simple', args: [] },
    { variant: 'simple', args: ['--source', 'index.js'] },
    { variant: 'workspace', args: ['--childPackage', 'packages/blorp'] }
  ];

  test.each(variants)('$variant: move $args', async ({ variant, args }) => {
    const project = await getProjectFixture(variant);
    const { run } = setupProjectRunner(project);
    const results = run(['move', ...args]);
    expect(results.exitCode).toBe(0);
    expect(results.stdout).toMatchSnapshot();
    project.dispose();
  });
});
