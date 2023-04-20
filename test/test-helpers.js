import { readFileSync, writeFileSync } from 'node:fs';
import Module from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandSync } from 'execa';
import JSON5 from 'json5';

import {
  readPackageJson,
  writePackageJson,
  findRehearsalPackages,
  updatePackageJson
} from '../utils';

const PROJECT_ROOT_URL = new URL('../', import.meta.url);
const PROJECT_ROOT_DIR = fileURLToPath(PROJECT_ROOT_URL);

function readTSConfig(baseDir) {
  return JSON5.parse(readFileSync(join(baseDir, './tsconfig.json'), 'utf-8'));
}

function writeTSConfig(baseDir, data) {
  writeFileSync(join(baseDir, './tsconfig.json'), JSON5.stringify(data, { space: 2, quote: '"' }));
}

function setupProjectWithRehearsalBinaries(project) {
  let packageJson = readPackageJson(project.baseDir);

  packageJson['packageManager'] = 'pnpm@7.12.1';
  // Get packageJson entries for @rehearsal packages from root package.json
  const packagePaths = findRehearsalPackages(readPackageJson(PROJECT_ROOT_DIR));

  // Add root relative paths to tarballs in package.json similar to this project
  packageJson = updatePackageJson(packageJson, packagePaths);

  writePackageJson(project.baseDir, packageJson);

  // Copy binaries from PROJECT_ROOT_DIR to fixture directory
  for (const [, packagePath] of packagePaths) {
    const tarballPath = join(PROJECT_ROOT_DIR, fileURLToPath(packagePath));
    const copyResults = commandSync(`cp ${tarballPath} ${project.baseDir}`, {
      cwd: PROJECT_ROOT_DIR
    });
    if (copyResults.exitCode !== 0) {
      throw new Error(
        `Copying ${tarballPath} to project fixture directory failed.\n${results.stderr}`
      );
    }
  }

  const results = commandSync('pnpm install', { cwd: project.baseDir });

  if (results.exitCode !== 0) {
    throw new Error(`Install failed; unable to setup project fixture.\n${results.stderr}`);
  }
}

export async function setupEmberProject(project) {
  addRehearsalDependencies(project);
  project.addDevDependency('@types/node', '18.15.12');
  project.addDevDependency('@glint/core', '1.0.0-beta.4');
  project.addDevDependency('@glint/template', '1.0.0-beta.4');
  project.addDevDependency('@glint/environment-ember-loose', '1.0.0-beta.4');
  project.addDevDependency('@glint/environment-ember-template-imports', '1.0.0-beta.4');
  project.addDevDependency('ember-cli-typescript', '5.2.1');
  project.addDevDependency('ember-template-imports', '3.4.2');

  await project.write();

  const opts = { cwd: project.baseDir, shell: true };
  // We have to use yarn for this step because ember cli doesn't know about pnpm usage.
  commandSync('yarn install', opts);
  commandSync('yarn ember generate ember-cli-typescript', opts);

  // Append glint configuration entry to tsconfig.json

  const tsConfig = readTSConfig(project.baseDir);

  tsConfig['glint'] = {
    environment: ['ember-loose', 'ember-template-imports'],
    checkStandaloneTemplates: true
  };

  writeTSConfig(project.baseDir, tsConfig);

  setupProjectWithRehearsalBinaries(project);

  return project;
}

function addRehearsalDependencies(project) {
  // Typescript
  project.addDevDependency('typescript', '5.0.4');

  // Eslint
  project.addDevDependency('eslint', '8.38.0');
  project.addDevDependency('@typescript-eslint/eslint-plugin', '5.59.0');
  project.addDevDependency('@typescript-eslint/parser', '5.59.0');

  // Prettier
  project.addDevDependency('prettier', '2.8.7');
  project.addDevDependency('eslint-config-prettier', '8.8.0');
  project.addDevDependency('eslint-plugin-prettier', '4.2.1');
}

/**
 * Add the necessary devDependencies for a project fixture to run rehearasl.
 * @param {Project} project
 * @returns
 */
export async function setupProject(project) {
  addRehearsalDependencies(project);

  await project.write();

  setupProjectWithRehearsalBinaries(project);

  return project;
}

/**
 *
 * @param {Project} project fixturify-project
 * @returns string path to rehearsal/cli bin within the project fixture.
 */
export function resolveCLIBin(project) {
  // Resolve the rehearsal CLI bin relative the installed instance for project fixture
  const require = Module.createRequire(join(project.baseDir, 'package.json'));
  const bin = require.resolve('@rehearsal/cli/bin/rehearsal.js');
  return bin;
}

export function runCommandFactory(rehearsalCLIBin, factoryOptions) {
  return (args, options) => {
    return commandSync(`node ${rehearsalCLIBin} ${args.join(' ')}`, {
      ...factoryOptions,
      ...options
    });
  };
}
