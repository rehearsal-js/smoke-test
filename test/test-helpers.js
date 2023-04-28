import Module from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandSync } from 'execa';
import { Project } from 'fixturify-project';
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

export function getSimpleProjectFixture() {
  const project = new Project('simple', '1.0.0', {
    files: {
      'index.js': `
          import './lib/hotdog';
          import './lib/burger';
        `,
      lib: {
        'hotdog.js': `import './sandwich';`,
        'burger.js': `import './sandwich';`,
        'sandwich.js': `import 'chalk';`
      }
    }
  });
  project.pkg.exports = './index.js';
  project.pkg.volta = {
    node: '16.19.0'
  };

  project.addDependency('chalk', '5.2.0');

  return project;
}

export function getWorkspaceProjectFixture() {
  const project = new Project('library-with-workspace', '1.0.0');

  project.files = {
    packages: {
      foo: {
        'package.json': `{
              "name": "@something/foo",
              "version": "1.0.0",
              "main": "index.js",
              "dependencies": {
                "@something/bar": "*"
              }
            }`,
        'index.js': `
              import './lib/a';
            `,
        lib: {
          'a.js': `
              // a.js
              console.log('foo');
             `
        }
      },
      bar: {
        'package.json': `{
              "name": "@something/bar",
              "version": "1.0.0",
              "main": "index.js",
              "dependencies": {
                "@something/baz": "*"
              },
              "devDependencies": {
                "@something/blorp": "*"
              }
            }`
      },
      baz: {
        'package.json': `{
              "name": "@something/baz",
              "version": "1.0.0",
              "main": "index.js",
              "dependencies": {
              }
            }`
      },
      blorp: {
        'package.json': `{
              "name": "@something/blorp",
              "version": "1.0.0",
              "main": "index.js"
            }`,
        'build.js': `import '../../some-shared-util';`,
        'index.js': `
              import './lib/impl';
            `,
        lib: {
          'impl.js': `
                // impl.js
              `
        }
      }
    },
    'package.json': `
          {
            "name": "library-with-workspace",
            "version": "1.0.0",
            "main": "index.js",
            "license": "MIT",
            "workspaces": [
              "packages/*"
            ]
          }
        `,
    'some-util.js': '// Some useful util file shared across packages.'
  };

  project.pkg.volta = {
    node: '16.19.0'
  };

  return project;
}

export function getProjectFixture(variant) {
  if (variant == 'simple') {
    return getSimpleProjectFixture();
  }
  if (variant == 'workspace') {
    return getWorkspaceProjectFixture();
  }

  throw new Error(`Invalid project fixture variant: ${variant}`);
}

export async function setupProjectRunner(variant) {
  const project = getProjectFixture(variant);
  await setupProject(project);
  const run = runCommandFactory(resolveCLIBin(project), { cwd: project.baseDir });
  return { run, project };
}
