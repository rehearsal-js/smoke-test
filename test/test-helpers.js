import { readFileSync, writeFileSync } from 'node:fs';
import Module from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandSync } from 'execa';

const PROJECT_ROOT = new URL('../', import.meta.url);

/**
 * @param {string} baseDir string path to a directory.
 * @returns pojo of package.json
 */
function readPackageJson(baseDir) {
  const pathToPackageJson = join(baseDir, './package.json');
  return JSON.parse(readFileSync(pathToPackageJson, 'utf8'));
}

function writePackageJson(baseDir, packageJson) {
  writeFileSync(join(baseDir, 'package.json'), JSON.stringify(packageJson, null, 2));
}

export function getRehearsalPackagePaths() {
  const rootPackageJson = readPackageJson(fileURLToPath(PROJECT_ROOT));

  // Iterate over devDependencies from the root projet's package.json
  // and filter for @rehearsal/ packages
  // Creates a array of tuples like:
  // [@rehearsal/cli, file:rehearsal-cli-2.X.X-beta.tgz, file:///path/to/project/root/rehearsal-cli-2.X.X-beta.tgz]

  const packagePaths = Object.entries(rootPackageJson.devDependencies)
    .filter(([packageName]) => packageName.startsWith('@rehearsal/'))
    .map(([packageName, packageResolutionUrl]) => {
      const pathToPackage = new URL(packageResolutionUrl, PROJECT_ROOT);
      return [packageName, packageResolutionUrl, pathToPackage];
    });

  if (packagePaths.length < 1) {
    throw new Error(
      'Unable to find rehearsal dependencies in root package.json. Did you run `sh download-rehearsal-cli.sh` ?'
    );
  }

  return packagePaths;
}

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

  let packagePaths = getRehearsalPackagePaths();

  if (!project.pkg.devDependencies) {
    project.pkg.devDependencies = {};
  }

  await project.write();

  const packageJson = readPackageJson(project.baseDir);

  packageJson['packageManager'] = 'pnpm@7.12.1';
  packageJson['resolutions'] = {};

  // Add all the rehearsal dependencies
  for (const [packageName, localPath] of packagePaths) {
    // Can't use addDev because that uses NPM and it complains about an invalid dependency
    packageJson['devDependencies'][packageName] = localPath;
    packageJson['resolutions'][packageName] = localPath;
  }

  writePackageJson(project.baseDir, packageJson);

  // Copy binaries to root of project fixture
  for (const [, , tarballPath] of packagePaths) {
    commandSync(`cp ${fileURLToPath(tarballPath)} ./`, { cwd: project.baseDir });
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
  console.log('Fixture Root: ', project.baseDir);
  console.log('Path to CLI in Fixture: ', bin);
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
