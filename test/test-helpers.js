import Module from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandSync } from 'execa';
import {
  readPackageJson,
  writePackageJson,
  findRehearsalPackages,
  updatePackageJson
} from '../utils';

const PROJECT_ROOT_URL = new URL('../', import.meta.url);
const PROJECT_ROOT_DIR = fileURLToPath(PROJECT_ROOT_URL);

/**
 * Add the necessary devDependencies for a project fixture to run rehearasl.
 * @param {Project} project
 * @returns
 */
export async function setupProject(project) {
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

  // Get packageJson entries for @rehearsal packages from root package.json
  // transform paths to be absolute paths to the tarball files.
  let packagePaths = findRehearsalPackages(readPackageJson(PROJECT_ROOT_DIR)).map(
    ([packageName, packagePath]) => {
      const pathToTarball = join(PROJECT_ROOT_DIR, fileURLToPath(packagePath));
      return [packageName, pathToTarball];
    }
  );

  await project.write();

  const packageJson = readPackageJson(project.baseDir);

  packageJson['packageManager'] = 'pnpm@7.12.1';

  updatePackageJson(packageJson, packagePaths);

  writePackageJson(project.baseDir, packageJson);

  // Copy binaries to root of project fixture
  for (const [, pathToTarball] of packagePaths) {
    commandSync(`cp ${pathToTarball} ./`, { cwd: project.baseDir });
  }

  let results;

  // Install dependencies
  results = commandSync('pnpm install', { cwd: project.baseDir });

  if (results.exitCode !== 0) {
    throw new Error(`Install failed; unable to setup project fixture.\n${results.stderr}`);
  }

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
