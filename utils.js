import { readFileSync, writeFileSync } from 'node:fs';
import { URL, fileURLToPath } from 'node:url';

import { join, resolve } from 'node:path';

const PROJECT_ROOT = new URL('./', import.meta.url);
const PROJECT_ROOT_DIR = fileURLToPath(PROJECT_ROOT);

/**
 * @param {string} baseDir string path to a directory.
 * @returns pojo of package.json
 */
export function readPackageJson(baseDir) {
  const pathToPackageJson = join(baseDir, './package.json');
  return JSON.parse(readFileSync(pathToPackageJson, 'utf8'));
}

export function writePackageJson(baseDir, packageJson) {
  writeFileSync(join(baseDir, 'package.json'), JSON.stringify(packageJson, null, 2));
}

/**
 *
 * @param {string} baseDir directory to lookup package.json.
 * @returns
 */
export function findRehearsalPackages(packageJson) {
  // Iterate over devDependencies from the root projet's package.json
  // and filter for @rehearsal/ packages
  // Creates a array of tuples like:
  // [@rehearsal/cli, file:rehearsal-cli-2.X.X-beta.tgz]
  if (!packageJson.devDependencies) {
    throw new Error('package.json does have a devDependencies entry');
  }

  const packagePaths = Object.entries(packageJson.devDependencies).filter(([packageName]) =>
    packageName.startsWith('@rehearsal/')
  );

  if (packagePaths.length < 1) {
    throw new Error(
      'Unable to find rehearsal dependencies in package.json. Did you run `sh download-rehearsal-cli.sh` ?'
    );
  }

  return packagePaths;
}

/**
 *
 * @param {Object} packageJson a POJO representing a package.json file.
 * @param {string[]} packagePaths an array of tuples [packageName, packagePath]
 * @returns
 */
export function updatePackageJson(packageJson, packagePaths) {
  if (!packageJson['devDependencies']) {
    packageJson['devDependencies'] = {};
  }

  if (!packageJson['resolutions']) {
    packageJson['resolutions'] = {};
  }

  for (const [packageName, packagePath] of packagePaths) {
    console.log(packageName, packagePath);
    packageJson['devDependencies'][packageName] = packagePath;
    packageJson['resolutions'][packageName] = packagePath;
  }

  return packageJson;
}
