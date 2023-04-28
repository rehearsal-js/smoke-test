/**
 * The purpose of this package is to provide a simple smoke test for @rehearsal/cli commands.
 * It is not intended to be used in production, nor should it be published to npm.
 *
 * Notice this is a JavaScript package with the only @rehearsal dependency being @rehearsal/cli.
 * TypeScript should NOT be configured by default in this package.
 * This package should mimic the user experience as closely as possible.
 */
import Module from 'node:module';
import { describe, expect, test } from 'vitest';
import { commandSync } from 'execa';
import { runCommandFactory } from './test-helpers';
// This binary is coming from the "download-rehearsal-cli" script
// we want to test the CLI binary that is downloaded from the master branch
// of https://github.com/rehearsal-js/rehearsal-js
// and NOT the @rehearsal/cli version published to npm
const require = Module.createRequire(import.meta.url);
const CLI_BIN = require.resolve('@rehearsal/cli/bin/rehearsal.js');

const run = runCommandFactory(CLI_BIN);

describe('smoke-test @rehearsal/cli no project', () => {
  // This test suite validates that basic packaging of the CLI doesn't
  // cause a runtime error.

  test('without command only --help', () => {
    const results = run(['--help']);
    expect(results.exitCode).toBe(0);
    expect(results.stdout).toContain('Usage: rehearsal [options] [command]');
    expect(results.stdout).toContain('migrate [options]');
    expect(results.stdout).toContain('graph [options] [basePath]');
    expect(results.stdout).toContain('move|mv [options]');
    expect(results.stdout).toContain('help [command]');
  });

  test('graph command --help', () => {
    const results = run(['graph', '--help']);
    expect(results.exitCode).toBe(0);
    expect(results.stdout).toContain('graph [options] [basePath]');
  });

  test('move command --help', () => {
    const results = run(['move', '--help']);
    expect(results.exitCode).toBe(0);
    expect(results.stdout).toContain('move|mv [options]');
  });

  test('migrate command --help', () => {
    const results = run(['migrate', '--help']);
    expect(results.exitCode).toBe(0);
    expect(results.stdout).toContain('migrate [options]');
  });
});
