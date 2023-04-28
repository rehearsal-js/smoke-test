#!/usr/bin/env node

import { describe, expect, test } from 'vitest';
import { setupProjectRunner } from './test-helpers';

describe('validation-test: rehearsal move', async () => {
  const variants = [
    { variant: 'simple', args: ['--help'] },
    //   { variant: 'simple', args: [] },
    { variant: 'simple', args: ['--source', 'index.js'] },
    { variant: 'workspace', args: ['--childPackage', 'packages/blorp'] }
  ];

  test.each(variants)('$variant: move $args', async ({ variant, args }) => {
    const { run, project } = await setupProjectRunner(variant);
    const results = run(['move', ...args]);
    expect(results.exitCode).toBe(0);
    expect(results.stdout).toMatchSnapshot();
    project.dispose();
  });
});
